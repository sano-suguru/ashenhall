import type { GameState } from '@/types/game-state';
import type { GameAction } from '@/types/game';
import { processGameStep } from './core';

/**
 * stepGame: ゲーム状態を1ステップ進め、差分アクションを返す純関数。
 * - 入力: 現在の GameState
 * - 出力: { newState, newActions }
 * - 依存: 旧 processGameStep などのロジックを内部で呼び出す（暫定）
 *
 * TODO: processGameStep の副作用を排除し、完全純粋関数化する
 */
export function stepGame(state: GameState): { newState: GameState; newActions: GameAction[] } {
  // 1ステップ進める
  const newState = processGameStep(state);
  // actionLog 差分抽出
  const prevSeq = new Set((state.actionLog ?? []).map((a: GameAction) => a.sequence));
  const newActions = (newState.actionLog ?? []).filter((a: GameAction) => !prevSeq.has(a.sequence));
  return { newState, newActions };
}
