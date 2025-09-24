import type { GameAction } from '@/types/game';

export type GameEventBatchKind = 'attack' | 'effect_damage' | 'other';

export interface EventBatch {
  id: string; // batch-${firstSequence}-${kind}-${index}
  kind: GameEventBatchKind;
  actions: GameAction[]; // 元アクション集合（順序保持）
  sequenceRange: { start: number; end: number };
  attackerId?: string; // kind==='attack'
  targetIds?: string[]; // attack/effect_damage 共通化
  sourceCardId?: string; // effect_damage
}
