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
} from "./game-state.ts";
import { updateOptimizedLookups } from "./field-search-cache.ts";
import {
  processDrawPhase,
  processEnergyPhase,
  processDeployPhase,
  processEndPhase,
} from "./phase-processors.ts";
// 旧battle-system.tsから統合
import { advancePhase } from "./game-state";
import { applyPassiveEffects } from "./card-effects";
import { createBattleIterator } from "./battle-iterator.ts";
import { assertNoLingeringDeadCreatures } from './invariants';

/**
 * Re-export createInitialGameState from game-state module
 */
export const createInitialGameState = createInitialGameStateImpl;

// === 統合された戦闘システム関数（旧battle-system.tsから） ===

/**
 * 戦闘フェーズの処理（battle_attackフェーズへの移行）
 */
function processBattlePhase(state: GameState): void {
  applyPassiveEffects(state);
  
  // battle_attack フェーズに直接移行（リスト作成不要）
  state.phase = 'battle_attack';
}

/**
 * 攻撃フェーズの処理（動的攻撃者チェック）
 */
function processAttackPhase(state: GameState): void {
  // BattleIterator 主体に移行後はここでフェーズ終了条件のみ判定
  if (state.players.player1.life <= 0 || state.players.player2.life <= 0) {
    advancePhase(state);
    return;
  }
  const currentPlayer = state.players[state.currentPlayer];
  const hasAttacker = currentPlayer.field.some(card =>
    card.currentHealth > 0 &&
    ((!card.isSilenced && card.keywords.includes("rush")) || card.summonTurn < state.turnNumber) &&
    !card.hasAttacked &&
    !card.statusEffects.some(e => e.type === 'stun')
  );
  if (!hasAttacker) {
    advancePhase(state);
  }
}

// === メインコア関数 ===

/**
 * ゲーム状態を1ステップ進める
 */
export function processGameStep(state: GameState): GameState {
  const newState = cloneGameState(state);

  // 高性能検索キャッシュ更新（Phase B最適化）
  updateOptimizedLookups(newState);

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
      consumeOneAttackerCombat(newState);
      break;
    case "end":
      processEndPhase(newState);
      break;
  }

  // 不変条件チェック: フェーズ処理完了時点で HP<=0 の未破壊カードが残っていないか
  assertNoLingeringDeadCreatures(newState);

  return newState;
}

// Headless 実行時に battle_attack フェーズで 1 攻撃者分のサブステージを同期消費
function consumeOneAttackerCombat(state: GameState): void {
  if (state.phase !== 'battle_attack') return;
  const it = createBattleIterator(state);
  if (!it) return; // 攻撃者なし
  let firstAttacker: string | undefined;
  // 1 攻撃者のサブステージ(attack_declare -> damage_defender -> damage_attacker -> deaths) をまとめて処理
  while (true) {
    const r = it.next();
    if (r.done) break;
    const current = it.context.currentAttackerId;
    if (!firstAttacker) {
      firstAttacker = current;
    } else if (current && firstAttacker !== current) {
      // 次の攻撃者に移ろうとしたので停止（次ステップへ委譲）
      break;
    } else if (!current) {
      // 攻撃者処理が完了した
      break;
    }
  }
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
