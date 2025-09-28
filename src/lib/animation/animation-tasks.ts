import type { GameAction } from '@/types/game';
import type { ValueChange } from '@/types/game-state';

export type AnimationTaskKind =
  | 'attack'
  | 'damage'
  | 'destroy'
  | 'summon'
  | 'draw'
  | 'spell_cast'
  | 'heal';

export interface AnimationTask {
  id: string;
  sequence: number; // 元アクションの sequence を基準に安定化
  kind: AnimationTaskKind;
  batchId: string; // バッチ識別子 (legacy 経路は legacy-<sequence>)
  origin: 'attack' | 'effect' | 'other';
  attackerId?: string;
  targetId?: string;
  damage?: number;
  snapshot?: {
    id: string;
    owner: string;
    name: string;
    attackTotal: number;
    healthTotal: number;
    currentHealth: number;
    baseAttack: number;
    baseHealth: number;
    keywords: string[];
  };
  duration: number; // ms (fallback用、CSS完了を優先監視)
  blocking: boolean; // true のタスクは直列保証
  cssAnimationClass: string; // CSS演出クラス名
}

export interface AnimationDurationsSpec {
  ATTACK_WINDUP: number;
  ATTACK_STRIKE: number;
  ATTACK_RETALIATE: number;
  IMPACT: number;
  DESTROY: number;
  MIN: number;
}

export const DefaultAnimationDurations: AnimationDurationsSpec = {
  ATTACK_WINDUP: 180,
  ATTACK_STRIKE: 220,
  ATTACK_RETALIATE: 220,
  IMPACT: 140,
  DESTROY: 400,
  MIN: 120,
};

// === CSS生成用定数（旧animation-durations.tsから統合） ===

/**
 * CSS生成用アニメーション持続時間定義
 * 単位: ミリ秒
 * UI（CSS）とロジック（TS）で一致させるための真実のソース
 */
export const AnimationDurations = {
  ATTACK: 300,
  DAMAGE: 1000,
  DESTROY: 1000,
  SUMMON: 800,
  DRAW: 600,
  SPELL_CAST: 500,
  HEAL: 400,
} as const;

export type AnimationPhase = keyof typeof AnimationDurations;

export function getDurationForPhaseMs(phase: AnimationPhase): number {
  return AnimationDurations[phase];
}

function ensureMin(d: number, spec: AnimationDurationsSpec): number { return Math.max(spec.MIN, d); }

/**
 * 新規アクション配列からアニメーションタスク列を生成（純関数）
 */

// === 共通ヘルパー関数 ===

/** AnimationTask生成の共通処理 */
function createAnimationTask(params: {
  id: string;
  sequence: number;
  kind: AnimationTaskKind;
  batchId: string;
  origin: 'attack' | 'effect' | 'other';
  duration: number;
  attackerId?: string;
  targetId?: string;
  damage?: number;
  snapshot?: AnimationTask['snapshot'];
  cssAnimationClass?: string;
}): AnimationTask {
  // CSS演出クラス名をkindに基づいて自動生成
  const cssClass = params.cssAnimationClass || getCssClassForAnimationKind(params.kind);
  
  return {
    id: params.id,
    sequence: params.sequence,
    kind: params.kind,
    batchId: params.batchId,
    origin: params.origin,
    attackerId: params.attackerId,
    targetId: params.targetId,
    damage: params.damage,
    snapshot: params.snapshot,
    duration: params.duration,
    blocking: true,
    cssAnimationClass: cssClass,
  };
}

/** AnimationTaskKindに対応するCSSクラス名を取得 */
function getCssClassForAnimationKind(kind: AnimationTaskKind): string {
  switch (kind) {
    case 'attack': return 'card-attacking';
    case 'damage': return 'card-being-attacked';
    case 'destroy': return 'card-dying';
    case 'summon': return 'card-summoning';
    case 'draw': return 'card-drawing';
    case 'spell_cast': return 'card-spell-casting';
    case 'heal': return 'card-healing';
    default: return '';
  }
}

/** ValueChangeからダメージ値を計算 */
function calculateDamageFromValueChange(change: ValueChange, fallbackValue: number): number {
  const hp = change.health;
  if (hp && typeof hp.before === 'number' && typeof hp.after === 'number') {
    return Math.max(0, hp.before - hp.after);
  }
  return fallbackValue;
}

// === アクションタイプ別処理関数 ===


/** card_attackアクションの処理 */
function processCardAttackAction(
  action: Extract<GameAction, { type: 'card_attack' }>,
  context: { nextId: (base: string, seq: number) => string; batchId: string; spec: AnimationDurationsSpec }
): AnimationTask[] {
  return [createAnimationTask({
    id: context.nextId('damage', action.sequence),
    sequence: action.sequence,
    kind: 'damage',
    attackerId: action.data.attackerCardId,
    targetId: action.data.targetId,
    damage: action.data.damage,
    duration: ensureMin(context.spec.IMPACT, context.spec),
    batchId: context.batchId,
    origin: 'attack'
  })];
}

/** effect_triggerアクションの処理 */
function processEffectTriggerAction(
  action: Extract<GameAction, { type: 'effect_trigger' }>,
  context: { nextId: (base: string, seq: number) => string; batchId: string; spec: AnimationDurationsSpec }
): AnimationTask[] {
  const tasks: AnimationTask[] = [];
  const sourceCardId = typeof action.data.sourceCardId === 'string' ? action.data.sourceCardId : undefined;
  
  // ダメージ演出
  if (action.data.effectType === 'damage') {
    for (const [targetId, change] of Object.entries(action.data.targets)) {
      if (targetId.startsWith('player')) continue;
      
      const damage = calculateDamageFromValueChange(change as ValueChange, action.data.effectValue);
      tasks.push(createAnimationTask({
        id: context.nextId('damage', action.sequence),
        sequence: action.sequence,
        kind: 'damage',
        attackerId: sourceCardId,
        targetId,
        damage,
        duration: ensureMin(context.spec.IMPACT, context.spec),
        batchId: context.batchId,
        origin: 'effect'
      }));
    }
  }
  
  // 回復演出
  if (action.data.effectType === 'heal') {
    for (const [targetId, change] of Object.entries(action.data.targets)) {
      const healAmount = change.health ? Math.max(0, (change.health.after as number) - (change.health.before as number)) : action.data.effectValue;
      tasks.push(createAnimationTask({
        id: context.nextId('heal', action.sequence),
        sequence: action.sequence,
        kind: 'heal',
        attackerId: sourceCardId,
        targetId,
        damage: healAmount, // 回復量をdamageフィールドに格納（後で整理）
        duration: 400, // AnimationDurations.HEAL相当
        batchId: context.batchId,
        origin: 'effect'
      }));
    }
  }
  
  return tasks;
}

/** creature_destroyedアクションの処理 */
function processCreatureDestroyedAction(
  action: Extract<GameAction, { type: 'creature_destroyed' }>,
  context: { nextId: (base: string, seq: number) => string; batchId: string; spec: AnimationDurationsSpec }
): AnimationTask[] {
  return [createAnimationTask({
    id: context.nextId('destroy', action.sequence),
    sequence: action.sequence,
    kind: 'destroy',
    targetId: action.data.destroyedCardId,
    snapshot: action.data.cardSnapshot,
    duration: ensureMin(context.spec.DESTROY, context.spec),
    batchId: context.batchId,
    origin: 'other'
  })];
}

/** card_playアクションの処理 (召喚・スペル使用演出) */
function processCardPlayAction(
  action: Extract<GameAction, { type: 'card_play' }>,
  context: { nextId: (base: string, seq: number) => string; batchId: string; spec: AnimationDurationsSpec }
): AnimationTask[] {
  const tasks: AnimationTask[] = [];
  
  const targetId = action.data.cardId;
  
  // カードプレイ演出（召喚・スペル共通）
  tasks.push(createAnimationTask({
    id: context.nextId('summon', action.sequence),
    sequence: action.sequence,
    kind: 'summon',
    targetId: targetId,
    duration: 800, // AnimationDurations.SUMMON相当
    batchId: context.batchId,
    origin: 'other'
  }));
  
  return tasks;
}

/** card_drawアクションの処理 (ドロー演出) */
function processCardDrawAction(
  action: Extract<GameAction, { type: 'card_draw' }>,
  context: { nextId: (base: string, seq: number) => string; batchId: string; spec: AnimationDurationsSpec }
): AnimationTask[] {
  return [createAnimationTask({
    id: context.nextId('draw', action.sequence),
    sequence: action.sequence,
    kind: 'draw',
    targetId: action.data.cardId,
    duration: 600, // AnimationDurations.DRAW相当
    batchId: context.batchId,
    origin: 'other'
  })];
}

/**
 * GameActionから直接AnimationTaskを生成（簡素化版）
 */
export function buildAnimationTasksFromActions(actions: GameAction[], spec: AnimationDurationsSpec = DefaultAnimationDurations): AnimationTask[] {
  const result: AnimationTask[] = [];
  let localTaskCounter = 0;
  const nextIdLocal = (base: string, seq: number) => `${seq}-${base}-${localTaskCounter++}`;
  
  for (const action of actions) {
    const batchId = `direct-${action.sequence}`;
    const context = { nextId: nextIdLocal, batchId, spec };
    
    switch (action.type) {
      case 'card_attack':
        result.push(...processCardAttackAction(action, context));
        break;
      case 'effect_trigger':
        result.push(...processEffectTriggerAction(action, context));
        break;
      case 'creature_destroyed':
        result.push(...processCreatureDestroyedAction(action, context));
        break;
      case 'card_play':
        result.push(...processCardPlayAction(action, context));
        break;
      case 'card_draw':
        result.push(...processCardDrawAction(action, context));
        break;
      default:
        break;
    }
  }
  
  return result.sort((a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id));
}
