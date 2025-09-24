import type { GameAction } from '@/types/game';
import type { ValueChange } from '@/types/game-state';

export type AnimationTaskKind =
  | 'attack_windup'
  | 'attack_strike'
  | 'attack_retaliate'
  | 'impact'
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

let taskCounter = 0;
function nextId(base: string, seq: number) { return `${seq}-${base}-${taskCounter++}`; }

/**
 * 新規アクション配列からアニメーションタスク列を生成（純関数）
 */
import type { EventBatch } from '@/types/event-batch';

export function buildAnimationTasksFromBatches(batches: EventBatch[], spec: AnimationDurationsSpec = DefaultAnimationDurations): AnimationTask[] {
  const result: AnimationTask[] = [];
  let taskCounter = 0;
  function nextId(base: string, seq: number) { return `${seq}-${base}-${taskCounter++}`; }
  for (const b of batches) {
    for (const a of b.actions) {
      switch (a.type) {
        case 'combat_stage': {
          const stage = a.data.stage;
          if (stage === 'attack_declare') {
            result.push({ id: nextId('windup', a.sequence), sequence: a.sequence, kind: 'attack_windup', attackerId: a.data.attackerId, targetId: a.data.targetId, duration: ensureMin(spec.ATTACK_WINDUP, spec), blocking: true, batchId: b.id, origin: 'attack' });
          } else if (stage === 'damage_defender') {
            result.push({ id: nextId('strike', a.sequence), sequence: a.sequence, kind: 'attack_strike', attackerId: a.data.attackerId, targetId: a.data.targetId, duration: ensureMin(spec.ATTACK_STRIKE, spec), blocking: true, batchId: b.id, origin: 'attack' });
          } else if (stage === 'damage_attacker') {
            result.push({ id: nextId('retaliate', a.sequence), sequence: a.sequence, kind: 'attack_retaliate', attackerId: a.data.attackerId, targetId: a.data.targetId, duration: ensureMin(spec.ATTACK_RETALIATE, spec), blocking: true, batchId: b.id, origin: 'attack' });
          }
          break;
        }
        case 'card_attack': {
            result.push({ id: nextId('impact', a.sequence), sequence: a.sequence, kind: 'impact', attackerId: a.data.attackerCardId, targetId: a.data.targetId, damage: a.data.damage, duration: ensureMin(spec.IMPACT, spec), blocking: true, batchId: b.id, origin: 'attack' });
          break;
        }
        case 'effect_trigger': {
          if (a.data.effectType === 'damage') {
            const attackerId = typeof a.data.sourceCardId === 'string' ? a.data.sourceCardId : undefined;
            for (const [targetId, change] of Object.entries(a.data.targets)) {
              if (targetId.startsWith('player')) continue;
              const vc = change as ValueChange;
              const hp = vc.health;
              let dmg = a.data.effectValue;
              if (hp && typeof hp.before === 'number' && typeof hp.after === 'number') {
                dmg = Math.max(0, hp.before - hp.after);
              }
              result.push({ id: nextId('impact', a.sequence), sequence: a.sequence, kind: 'impact', attackerId, targetId, damage: dmg, duration: ensureMin(spec.IMPACT, spec), blocking: true, batchId: b.id, origin: b.kind === 'effect_damage' ? 'effect' : 'other' });
            }
          }
          break;
        }
        case 'creature_destroyed': {
          result.push({ id: nextId('destroy', a.sequence), sequence: a.sequence, kind: 'destroy', targetId: a.data.destroyedCardId, snapshot: a.data.cardSnapshot, duration: ensureMin(spec.DESTROY, spec), blocking: true, batchId: b.id, origin: 'other' });
          break;
        }
        default:
          break;
      }
    }
  }
  return result.sort((a,b)=> a.sequence - b.sequence || a.id.localeCompare(b.id));
}
