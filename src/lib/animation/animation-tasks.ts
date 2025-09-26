import type { GameAction } from '@/types/game';
import type { ValueChange } from '@/types/game-state';

export type AnimationTaskKind =
  | 'attack'
  | 'damage'
  | 'destroy';

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
  duration: number; // ms
  blocking: boolean; // true のタスクは直列保証
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
}): AnimationTask {
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
  };
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

/** combat_stageアクションの処理 */
function processCombatStageAction(
  action: Extract<GameAction, { type: 'combat_stage' }>,
  context: { nextId: (base: string, seq: number) => string; batchId: string; spec: AnimationDurationsSpec }
): AnimationTask[] {
  const stage = action.data.stage;
  if (stage === 'attack_declare' || stage === 'damage_defender' || stage === 'damage_attacker') {
    return [createAnimationTask({
      id: context.nextId('attack', action.sequence),
      sequence: action.sequence,
      kind: 'attack',
      attackerId: action.data.attackerId,
      targetId: action.data.targetId,
      duration: ensureMin(context.spec.ATTACK_WINDUP, context.spec),
      batchId: context.batchId,
      origin: 'attack'
    })];
  }
  return [];
}

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
  if (action.data.effectType !== 'damage') return [];
  
  const tasks: AnimationTask[] = [];
  const attackerId = typeof action.data.sourceCardId === 'string' ? action.data.sourceCardId : undefined;
  
  for (const [targetId, change] of Object.entries(action.data.targets)) {
    if (targetId.startsWith('player')) continue;
    
    const damage = calculateDamageFromValueChange(change as ValueChange, action.data.effectValue);
    tasks.push(createAnimationTask({
      id: context.nextId('damage', action.sequence),
      sequence: action.sequence,
      kind: 'damage',
      attackerId,
      targetId,
      damage,
      duration: ensureMin(context.spec.IMPACT, context.spec),
      batchId: context.batchId,
      origin: 'effect'
    }));
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
      case 'combat_stage':
        result.push(...processCombatStageAction(action, context));
        break;
      case 'card_attack':
        result.push(...processCardAttackAction(action, context));
        break;
      case 'effect_trigger':
        result.push(...processEffectTriggerAction(action, context));
        break;
      case 'creature_destroyed':
        result.push(...processCreatureDestroyedAction(action, context));
        break;
      default:
        break;
    }
  }
  
  return result.sort((a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id));
}
