/**
 * Ashenhall ゲームエンジン コア
 *
 * 設計方針:
 * - 決定論的な戦闘計算（同じ入力なら同じ結果）
 * - 戦闘ログの完全再現が可能
 * - 5秒以内での戦闘完了
 * - 型安全でテスト可能な構造
 */

import type {
  GameState,
  Card,
  Faction,
  TacticsType,
} from "@/types/game";
import {
  createInitialGameState as createInitialGameStateImpl,
  cloneGameState,
  checkGameEnd,
} from "./game-state";
import {
  processDrawPhase,
  processEnergyPhase,
  processDeployPhase,
  processEndPhase,
} from "./phase-processors";
import { processBattlePhase, processAttackPhase } from "./battle-system";

/**
 * Re-export createInitialGameState from game-state module
 */
export const createInitialGameState = createInitialGameStateImpl;

/**
 * ゲーム状態を1ステップ進める
 */
export function processGameStep(state: GameState): GameState {
  const newState = cloneGameState(state);

  // ゲーム終了チェック
  const gameResult = checkGameEnd(newState);
  if (gameResult) {
    newState.result = gameResult;
    return newState;
  }

  // フェーズ処理
  switch (newState.phase) {
    case "draw":
      processDrawPhase(newState);
      break;
    case "energy":
      processEnergyPhase(newState);
      break;
    case "deploy":
      processDeployPhase(newState);
      break;
    case "battle":
      processBattlePhase(newState);
      break;
    case "battle_attack":
      processAttackPhase(newState);
      break;
    case "end":
      processEndPhase(newState);
      break;
  }

  return newState;
}

/**
 * ゲームを完了まで実行
 */
export function executeFullGame(
  gameId: string,
  player1Deck: Card[],
  player2Deck: Card[],
  player1Faction: Faction,
  player2Faction: Faction,
  player1Tactics: TacticsType,
  player2Tactics: TacticsType,
  randomSeed: string
): GameState {
  let gameState = createInitialGameState(
    gameId,
    player1Deck,
    player2Deck,
    player1Faction,
    player2Faction,
    player1Tactics,
    player2Tactics,
    randomSeed
  );

  const maxSteps = 1000; // 無限ループ防止
  let steps = 0;

  while (!gameState.result && steps < maxSteps) {
    gameState = processGameStep(gameState);
    steps++;
  }

  // 強制終了の場合
  if (!gameState.result) {
    gameState.result = {
      winner: null,
      reason: "timeout",
      totalTurns: gameState.turnNumber,
      durationSeconds: Math.floor((Date.now() - gameState.startTime) / 1000),
      endTime: Date.now(),
    };
  }

  return gameState;
}
