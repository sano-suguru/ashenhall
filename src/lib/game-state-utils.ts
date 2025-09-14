/**
 * ゲーム状態操作ユーティリティ
 *
 * 設計方針:
 * - 状態復元（巻き戻し）機能
 * - 戦闘結果のテキスト出力
 * - 決定論的な再現性を保証
 */

import type {
  GameState,
  GameAction,
  PlayerId,
  LogDisplayParts,
} from "@/types/game";
import { createInitialGameState, processGameStep } from "./game-engine/core";
import { getCardById } from "@/data/cards/base-cards";
import { logFormatters } from "./log-formatters";

// UIコンポーネントから移植された定数とヘルパー関数
export function getCardName(cardId: string): string {
  const card = getCardById(cardId);
  return card?.name || cardId;
}

const SPECIAL_SOURCE_NAMES: Record<string, string> = {
  poison_effect: "毒",
  deck_empty: "デッキ切れ",
};

export function getSourceDisplayName(sourceId: string): string {
  return SPECIAL_SOURCE_NAMES[sourceId] || `《${getCardName(sourceId)}》`;
}

export function getPlayerName(playerId: PlayerId): string {
  return playerId === "player1" ? "あなた" : "相手";
}

export function getTurnNumberForAction(
  action: GameAction,
  gameState: GameState
): number {
  let turnNumber = 1;
  for (let i = 0; i <= action.sequence; i++) {
    const currentAction = gameState.actionLog[i];
    if (
      currentAction &&
      currentAction.type === "phase_change" &&
      currentAction.data.toPhase === "draw"
    ) {
      if (i > 0) {
        turnNumber++;
      }
    }
  }
  return turnNumber;
}

/**
 * 指定したアクションシーケンスまでの状態を復元
 */
export function reconstructStateAtSequence(
  originalState: GameState,
  targetSequence: number
): GameState {
  // 0以下の場合は初期状態を返す
  if (targetSequence <= 0) {
    return reconstructInitialState(originalState);
  }

  // 対象シーケンス以降のアクションを除外
  const actionsToReplay = originalState.actionLog.filter(
    (action) => action.sequence <= targetSequence
  );

  // 初期状態から再構築
  let state = reconstructInitialState(originalState);

  // アクションを順番に再実行
  let stepCount = 0;
  const maxSteps = 1000; // 無限ループ防止

  while (
    state.actionLog.length < actionsToReplay.length &&
    stepCount < maxSteps
  ) {
    const nextState = processGameStep(state);

    // 進行しなくなった場合（エラー状態）は停止
    if (nextState.actionLog.length === state.actionLog.length) {
      break;
    }

    state = nextState;
    stepCount++;
  }

  return state;
}

/**
 * 元のゲーム状態から初期状態を復元
 */
function reconstructInitialState(originalState: GameState): GameState {
  // 初期デッキを復元（hand + deck + field + graveyard から）
  const player1Cards = [
    ...originalState.players.player1.hand,
    ...originalState.players.player1.deck,
    ...originalState.players.player1.field,
    ...originalState.players.player1.graveyard,
  ];

  const player2Cards = [
    ...originalState.players.player2.hand,
    ...originalState.players.player2.deck,
    ...originalState.players.player2.field,
    ...originalState.players.player2.graveyard,
  ];

  return createInitialGameState(
    originalState.gameId,
    player1Cards,
    player2Cards,
    originalState.players.player1.faction,
    originalState.players.player2.faction,
    originalState.players.player1.tacticsType,
    originalState.players.player2.tacticsType,
    originalState.randomSeed
  );
}

/**
 * ログアクションから表示用の構造化データを生成する共通関数
 */
export function getLogDisplayParts(action: GameAction, gameState: GameState): LogDisplayParts {
  const playerName = getPlayerName(action.playerId);
  const formatter = logFormatters[action.type];
  return formatter(action, playerName, gameState);
}

/**
 * アクションを詳細なテキスト形式に変換（共通ロジック）
 */
export function formatActionAsText(
  action: GameAction,
  gameState: GameState
): string {
  const seq = `#${action.sequence.toString().padStart(3, "0")}`;
  const parts = getLogDisplayParts(action, gameState);

  let text = `${seq} [${parts.playerName}] ${parts.message}`;
  if (parts.details) text += ` ${parts.details}`;
  if (parts.triggerText) text += ` (${parts.triggerText})`;

  return text;
}

/**
 * 戦闘結果のテキストレポートを生成
 */
export function generateBattleReport(gameState: GameState): string {
  const player1 = gameState.players.player1;
  const player2 = gameState.players.player2;
  const result = gameState.result;

  if (!result) {
    return "戦闘が進行中です";
  }

  // 基本情報
  const header = `⚔️ Ashenhall戦闘記録\n`;
  const matchup = `${getFactionName(player1.faction)}(${getTacticsName(
    player1.tacticsType
  )}) vs ${getFactionName(player2.faction)}(${getTacticsName(
    player2.tacticsType
  )})\n`;

  // 勝敗
  let winnerText = "";
  if (result.winner === "player1") {
    winnerText = "あなたの勝利！";
  } else if (result.winner === "player2") {
    winnerText = "相手の勝利";
  } else {
    winnerText = "引き分け";
  }

  const resultInfo = `勝者: ${winnerText} | ターン: ${
    result.totalTurns
  } | 理由: ${getReasonText(result.reason)}\n`;

  // 統計情報
  const stats = generateBattleStatistics(gameState);
  const statsText = `\n📊 戦闘統計:\n${stats}\n`;

  // 主要アクション（ダメージの大きい攻撃など）
  const keyActions = generateKeyActions(gameState);
  const actionsText =
    keyActions.length > 0 ? `\n🎯 主要アクション:\n${keyActions}\n` : "";

  return header + matchup + resultInfo + statsText + actionsText;
}

/**
 * SNS共有用の短縮テキストを生成
 */
export function generateShareableText(gameState: GameState): string {
  const player1 = gameState.players.player1;
  const player2 = gameState.players.player2;
  const result = gameState.result;

  if (!result) {
    return "Ashenhall戦闘進行中";
  }

  let winnerText = "";
  if (result.winner === "player1") {
    winnerText = "勝利";
  } else if (result.winner === "player2") {
    winnerText = "敗北";
  } else {
    winnerText = "引き分け";
  }

  return `🏆 Ashenhall ${winnerText}！\n${getFactionName(
    player1.faction
  )} vs ${getFactionName(player2.faction)} (T${result.totalTurns})`;
}

/**
 * 戦闘統計を生成
 */
function generateBattleStatistics(gameState: GameState): string {
  const player1 = gameState.players.player1;
  const player2 = gameState.players.player2;

  // ダメージ統計
  const player1Damage = calculateTotalDamageDealt(gameState, "player1");
  const player2Damage = calculateTotalDamageDealt(gameState, "player2");

  // カード使用統計
  const player1CardsPlayed = countCardsPlayed(gameState, "player1");
  const player2CardsPlayed = countCardsPlayed(gameState, "player2");

  const lines = [
    `- 総ダメージ: あなた${player1Damage} vs 相手${player2Damage}`,
    `- カード使用: ${player1CardsPlayed}枚 vs ${player2CardsPlayed}枚`,
    `- 最終ライフ: ${player1.life} vs ${player2.life}`,
    `- 残り手札: ${player1.hand.length}枚 vs ${player2.hand.length}枚`,
  ];

  return lines.join("\n");
}

/**
 * 主要アクションを抽出
 */
function generateKeyActions(gameState: GameState): string {
  const keyActions: string[] = [];

  // 大ダメージ攻撃（5以上）を抽出
  gameState.actionLog.forEach((action) => {
    if (action.type === "card_attack") {
      const attackData = action.data;
      if (attackData.damage >= 5) {
        const turnNumber = estimateTurnNumber(gameState, action.sequence);
        const attackerName = getCardDisplayName(attackData.attackerCardId);
        const isPlayerTarget =
          attackData.targetId === "player1" ||
          attackData.targetId === "player2";
        const target = isPlayerTarget
          ? "プレイヤー"
          : getCardDisplayName(attackData.targetId);
        const playerName = action.playerId === "player1" ? "あなた" : "相手";

        keyActions.push(
          `- T${turnNumber}: [${playerName}] ${attackerName} → ${target} (${attackData.damage}ダメージ)`
        );
      }
    }
  });

  // 決定打（最後のライフダメージ）
  const finalAttack = gameState.actionLog
    .filter((action) => action.type === "card_attack")
    .filter((action) => {
      if (action.type === "card_attack") {
        return (
          action.data.targetId === "player1" ||
          action.data.targetId === "player2"
        );
      }
      return false;
    })
    .pop();

  if (
    finalAttack &&
    finalAttack.type === "card_attack" &&
    gameState.result?.reason === "life_zero"
  ) {
    const turnNumber = estimateTurnNumber(gameState, finalAttack.sequence);
    const attackerName = getCardDisplayName(finalAttack.data.attackerCardId);
    const playerName = finalAttack.playerId === "player1" ? "あなた" : "相手";

    keyActions.push(
      `🏆 決定打: T${turnNumber} [${playerName}] ${attackerName}の直接攻撃 (${finalAttack.data.damage}ダメージ)`
    );
  }

  return keyActions.slice(0, 5).join("\n"); // 最大5個まで
}

/**
 * プレイヤーの総ダメージ量を計算
 */
function calculateTotalDamageDealt(
  gameState: GameState,
  playerId: string
): number {
  return gameState.actionLog
    .filter(
      (action) => action.type === "card_attack" && action.playerId === playerId
    )
    .reduce((total, action) => {
      if (action.type === "card_attack") {
        return total + action.data.damage;
      }
      return total;
    }, 0);
}

/**
 * プレイヤーの使用カード数をカウント
 */
function countCardsPlayed(gameState: GameState, playerId: string): number {
  return gameState.actionLog.filter(
    (action) => action.type === "card_play" && action.playerId === playerId
  ).length;
}

/**
 * アクションのターン数を推定
 */
function estimateTurnNumber(gameState: GameState, sequence: number): number {
  // そのsequence以前のターン開始アクションを探す
  for (let i = sequence; i >= 0; i--) {
    const action = gameState.actionLog[i];
    if (action?.type === "phase_change" && action.data.toPhase === "draw") {
      return Math.floor((action.sequence + 1) / 5) + 1;
    }
  }
  return 1;
}

/**
 * カード表示名を取得
 */
function getCardDisplayName(cardId: string): string {
  const card = getCardById(cardId);
  return card?.name || cardId;
}

/**
 * 勢力名の日本語表示
 */
function getFactionName(faction: string): string {
  const names: Record<string, string> = {
    necromancer: '死霊術師',
    berserker: '戦狂い',
    mage: '魔導士',
    knight: '騎士',
    inquisitor: '審問官',
  };
  return names[faction] || faction;
}

/**
 * 戦術名の日本語表示
 */
function getTacticsName(tactics: string): string {
  const names: Record<string, string> = {
    aggressive: "攻撃重視",
    defensive: "守備重視",
    tempo: "速攻重視",
    balanced: "バランス",
  };
  return names[tactics] || tactics;
}

/**
 * 勝利理由の日本語表示
 */
function getReasonText(reason: string): string {
  const reasons: Record<string, string> = {
    life_zero: "ライフ0",
    timeout: "時間切れ",
    deck_empty: "デッキ切れ",
    surrender: "降参",
  };
  return reasons[reason] || reason;
}

/**
 * カード攻撃がプレイヤーを対象としているかを判定する型ガード関数
 */
function isCardAttackToPlayer(action: GameAction): action is GameAction & { type: 'card_attack' } {
  return action.type === 'card_attack' && 
         (action.data.targetId === 'player1' || action.data.targetId === 'player2');
}

/**
 * エフェクトがライフダメージを与えているかを判定する型ガード関数
 */
function isLifeDamageEffect(action: GameAction): action is GameAction & { type: 'effect_trigger' } {
  if (action.type !== 'effect_trigger' || action.data.effectType !== 'damage') {
    return false;
  }
  
  return Object.values(action.data.targets).some(t => 
    t.life && t.life.before > t.life.after
  );
}

/**
 * カード攻撃アクションがダメージを与えているかを判定するヘルパー関数
 */
function hasDamage(action: GameAction & { type: 'card_attack' }): boolean {
  return action.data.damage > 0;
}

/**
 * 決定打アクションを特定する関数（複雑度最適化済み）
 */
export function findDecisiveAction(gameState: GameState): GameAction | null {
  if (!gameState.result || gameState.result.reason !== "life_zero") return null;

  // 最後のライフダメージを与えたアクションを逆順検索
  for (let i = gameState.actionLog.length - 1; i >= 0; i--) {
    const action = gameState.actionLog[i];
    
    if (isCardAttackToPlayer(action) && hasDamage(action)) {
      return action;
    }
    
    if (isLifeDamageEffect(action)) {
      return action;
    }
  }
  
  return null;
}

// 最終状態サマリーの型定義
interface FinalGameState {
  player1: {
    life: number;
    fieldCards: number;
    handCards: number;
    deckCards: number;
  };
  player2: {
    life: number;
    fieldCards: number;
    handCards: number;
    deckCards: number;
  };
}

// 最終状態を取得する関数
export function getFinalGameState(gameState: GameState): FinalGameState {
  return {
    player1: {
      life: gameState.players.player1.life,
      fieldCards: gameState.players.player1.field.length,
      handCards: gameState.players.player1.hand.length,
      deckCards: gameState.players.player1.deck.length,
    },
    player2: {
      life: gameState.players.player2.life,
      fieldCards: gameState.players.player2.field.length,
      handCards: gameState.players.player2.hand.length,
      deckCards: gameState.players.player2.deck.length,
    },
  };
}
