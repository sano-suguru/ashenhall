import type { GameAction } from '@/types/game';
import type { EventBatch } from '@/types/event-batch';

/**
 * アクション列からイベントバッチを抽出する純関数。
 * 暫定ルール:
 *  - 連続する combat_stage(attack_declare→damage_defender→damage_attacker→deaths?) と card_attack / creature_destroyed をまとめて attack バッチ。
 *  - effect_trigger(damage) 単体を effect_damage バッチ。
 *  - その他は単独 other バッチ。
 */
// eslint-disable-next-line complexity
function collectAttackBatch(startIndex: number, actions: GameAction[]): { batch: EventBatch; nextIndex: number } | null {
  const first = actions[startIndex];
  if (!(first.type === 'combat_stage' && first.data.stage === 'attack_declare')) return null;
  const attackActions: GameAction[] = [first];
  const attackerId = first.data.attackerId;
  const targetId = first.data.targetId;
  let j = startIndex + 1;
  for (; j < actions.length; j++) {
    const nxt = actions[j];
    if (nxt.type === 'combat_stage') {
      const st = nxt.data.stage;
      if (st === 'damage_defender' || st === 'damage_attacker' || st === 'deaths') {
        attackActions.push(nxt);
        continue;
      }
      break;
    }
    if (nxt.type === 'card_attack' || nxt.type === 'creature_destroyed') {
      attackActions.push(nxt);
      continue;
    }
    break;
  }
  const seqStart = attackActions[0].sequence;
  const seqEnd = attackActions[attackActions.length - 1].sequence;
  return {
    batch: {
      id: `batch-${seqStart}-attack-${seqStart}`,
      kind: 'attack',
      actions: attackActions,
      sequenceRange: { start: seqStart, end: seqEnd },
      attackerId,
      targetIds: targetId ? [targetId] : undefined,
    },
    nextIndex: j,
  };
}

function collectEffectDamageBatch(index: number, actions: GameAction[]): EventBatch | null {
  const a = actions[index];
  if (!(a.type === 'effect_trigger' && a.data.effectType === 'damage')) return null;
  const seq = a.sequence;
  const targets = Object.keys(a.data.targets).filter(t => !t.startsWith('player'));
  return {
    id: `batch-${seq}-effect-${seq}`,
    kind: 'effect_damage',
    actions: [a],
    sequenceRange: { start: seq, end: seq },
    sourceCardId: typeof a.data.sourceCardId === 'string' ? a.data.sourceCardId : undefined,
    targetIds: targets.length ? targets : undefined,
  };
}

export function buildEventBatches(actions: GameAction[]): EventBatch[] {
  const batches: EventBatch[] = [];
  let i = 0;
  while (i < actions.length) {
    const attack = collectAttackBatch(i, actions);
    if (attack) { batches.push(attack.batch); i = attack.nextIndex; continue; }
    const effect = collectEffectDamageBatch(i, actions);
    if (effect) { batches.push(effect); i += 1; continue; }
    const a = actions[i];
    batches.push({
      id: `batch-${a.sequence}-other-${a.sequence}`,
      kind: 'other',
      actions: [a],
      sequenceRange: { start: a.sequence, end: a.sequence },
    });
    i += 1;
  }
  return batches;
}
