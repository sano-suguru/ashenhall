/**
 * Ashenhall ゲーム状態管理システム
 * 
 * 設計方針:
 * - ゲーム状態の初期化とコピー
 * - 勝利判定ロジック
 * - 決定論的な状態操作
 */

import type {
  GameState,
  PlayerState,
  PlayerId,
  GamePhase,
  Card,
  GameResult,
  Faction,
  TacticsType,
} from "@/types/game";
import { GAME_CONSTANTS } from "@/types/game";
import { SeededRandom } from "./seeded-random";
import { addPhaseChangeAction } from "./action-logger";

/**
 * 初期ゲーム状態を作成
 */
export function createInitialGameState(
  gameId: string,
  player1Deck: Card[],
  player2Deck: Card[],
  player1Faction: Faction,
  player2Faction: Faction,
  player1Tactics: TacticsType,
  player2Tactics: TacticsType,
  randomSeed: string
): GameState {
  const random = new SeededRandom(randomSeed);

  const createPlayerState = (
    id: PlayerId,
    deck: Card[],
    faction: Faction,
    tactics: TacticsType
  ): PlayerState => {
    const shuffledDeck = random.shuffle(deck);
    const initialHand = shuffledDeck.slice(0, GAME_CONSTANTS.INITIAL_HAND_SIZE); // 初期手札4枚
    const remainingDeck = shuffledDeck.slice(GAME_CONSTANTS.INITIAL_HAND_SIZE);

    return {
      id,
      life: GAME_CONSTANTS.INITIAL_LIFE,
      energy: GAME_CONSTANTS.INITIAL_ENERGY,
      maxEnergy: GAME_CONSTANTS.INITIAL_MAX_ENERGY,
      faction,
      tacticsType: tactics,
      deck: remainingDeck,
      hand: initialHand,
      field: [],
      graveyard: [],
    };
  };

  const startTime = Date.now();

  // 先攻をランダムに決定
  const firstPlayer: PlayerId = random.next() < 0.5 ? "player1" : "player2";

  return {
    gameId,
    turnNumber: 1,
    currentPlayer: firstPlayer,
    phase: "draw",
    players: {
      player1: createPlayerState(
        "player1",
        player1Deck,
        player1Faction,
        player1Tactics
      ),
      player2: createPlayerState(
        "player2",
        player2Deck,
        player2Faction,
        player2Tactics
      ),
    },
    actionLog: [
      {
        sequence: 0,
        playerId: firstPlayer,
        type: "phase_change",
        data: {
          fromPhase: "draw" as GamePhase,
          toPhase: "draw" as GamePhase,
        },
        timestamp: startTime,
      },
    ],
    randomSeed,
    startTime,
  };
}

/**
 * ゲーム状態の完全コピーを作成
 */
export function cloneGameState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state));
}

/**
 * 勝利判定
 */
export function checkGameEnd(state: GameState): GameResult | null {
  const player1 = state.players.player1;
  const player2 = state.players.player2;

  // ライフ0での敗北
  if (player1.life <= 0 && player2.life <= 0) {
    return {
      winner: null,
      reason: "life_zero",
      totalTurns: state.turnNumber,
      durationSeconds: Math.floor((Date.now() - state.startTime) / 1000),
      endTime: Date.now(),
    };
  } else if (player1.life <= 0) {
    return {
      winner: "player2",
      reason: "life_zero",
      totalTurns: state.turnNumber,
      durationSeconds: Math.floor((Date.now() - state.startTime) / 1000),
      endTime: Date.now(),
    };
  } else if (player2.life <= 0) {
    return {
      winner: "player1",
      reason: "life_zero",
      totalTurns: state.turnNumber,
      durationSeconds: Math.floor((Date.now() - state.startTime) / 1000),
      endTime: Date.now(),
    };
  }

  // 制限時間による終了（30ターン）
  if (state.turnNumber > 30) {
    const winner =
      player1.life > player2.life
        ? "player1"
        : player2.life > player1.life
        ? "player2"
        : null;
    return {
      winner,
      reason: "timeout",
      totalTurns: state.turnNumber,
      durationSeconds: Math.floor((Date.now() - state.startTime) / 1000),
      endTime: Date.now(),
    };
  }

  return null; // ゲーム続行
}

/**
 * フェーズを進める
 */
export function advancePhase(state: GameState): void {
  const phaseOrder: GamePhase[] = ["draw", "energy", "deploy", "battle", "end"];
  const currentIndex = phaseOrder.indexOf(state.phase);
  const nextPhase = phaseOrder[(currentIndex + 1) % phaseOrder.length];

  // ターンが一周する場合の処理
  if (nextPhase === "draw") {
    const nextPlayer =
      state.currentPlayer === "player1" ? "player2" : "player1";
    const nextTurnNumber = state.turnNumber + 1;

    // ターン開始時は実際に行動するプレイヤーのIDでログを記録
    addPhaseChangeAction(state, nextPlayer, {
      fromPhase: state.phase,
      toPhase: nextPhase,
    });

    state.currentPlayer = nextPlayer;
    state.turnNumber = nextTurnNumber;
  } else {
    // 通常のフェーズ変化
    addPhaseChangeAction(state, state.currentPlayer, {
      fromPhase: state.phase,
      toPhase: nextPhase,
    });
  }

  state.phase = nextPhase;
}
