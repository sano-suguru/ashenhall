import type { GameState, FieldCard, GameAction } from '@/types/game';
import { handleCreatureDeath } from './card-effects';

// 破壊アクションから既に死亡処理済みのカードID集合を作成
function collectDestroyedIds(actions: GameAction[]): Set<string> {
  const s = new Set<string>();
  for (const a of actions) {
    if (a.type === 'creature_destroyed') {
      const destroyedId = (a as Extract<GameAction,{type:'creature_destroyed'}>).data.destroyedCardId;
      s.add(destroyedId);
    }
  }
  return s;
}

// 共通死亡スイープ: currentHealth<=0 かつ まだ破壊アクションが存在しない場のカードを破壊処理
// origin / sourceCardId は将来のデバッグ用途（現状では actionLog には直接出さない）
export function evaluatePendingDeaths(
  state: GameState,
  origin: 'effect' | 'trigger' | 'passive' | 'system',
  sourceCardId?: string,
): void {
  const destroyedIds = collectDestroyedIds(state.actionLog);
  const pending: FieldCard[] = [];
  for (const pId of ['player1','player2'] as const) {
    const player = state.players[pId];
    for (const c of player.field) {
      if (c.currentHealth <= 0 && !destroyedIds.has(c.id)) {
        pending.push(c);
      }
    }
  }
  if (pending.length === 0) return;
  for (const card of pending) {
    handleCreatureDeath(state, card, 'effect', sourceCardId || origin);
  }
}

export const __deathSweepTestHooks = { evaluatePendingDeaths };
