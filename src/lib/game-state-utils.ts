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
  EffectAction,
  EffectTrigger,
  LogDisplayParts,
  Keyword,
} from "@/types/game";
import { createInitialGameState, processGameStep } from "./game-engine/core";
import { getCardById } from "@/data/cards/base-cards";
import { GAME_CONSTANTS } from "@/types/game";

// UIコンポーネントから移植された定数とヘルパー関数
const EFFECT_NAMES: Record<EffectAction, string> = {
  damage: "ダメージ",
  heal: "回復",
  buff_attack: "攻撃力強化",
  buff_health: "体力強化",
  debuff_attack: "攻撃力低下",
  debuff_health: "体力低下",
  summon: "召喚",
  draw_card: "ドロー",
  resurrect: "蘇生",
  silence: "沈黙",
  guard: "守護",
  stun: "スタン",
  destroy_deck_top: "デッキ破壊",
  swap_attack_health: "攻/体入替",
  hand_discard: "手札破壊",
  destroy_all_creatures: "全体破壊",
  ready: "再攻撃可能",
};

const PHASE_NAMES: Record<string, string> = {
  draw: "ドロー",
  energy: "エネルギー",
  deploy: "配置",
  battle: "戦闘",
  end: "終了",
};

function getCardName(cardId: string): string {
  const card = getCardById(cardId);
  return card?.name || cardId;
}

const SPECIAL_SOURCE_NAMES: Record<string, string> = {
  poison_effect: "毒",
  deck_empty: "デッキ切れ",
};

function getSourceDisplayName(sourceId: string): string {
  return SPECIAL_SOURCE_NAMES[sourceId] || `《${getCardName(sourceId)}》`;
}

function getPlayerName(playerId: PlayerId): string {
  return playerId === "player1" ? "あなた" : "相手";
}

const KEYWORD_NAMES: Record<Keyword, string> = {
  guard: "守護",
  lifesteal: "生命奪取",
  stealth: "潜伏",
  poison: "毒",
  retaliate: "報復",
  echo: "残響",
  formation: "連携",
  rush: "速攻",
  trample: "貫通",
};

// UIコンポーネントから移植
const TRIGGER_TYPE_NAMES: Record<EffectTrigger, string> = {
  on_play: 'プレイされた時',
  on_death: '死亡した時',
  turn_start: 'ターン開始時',
  turn_end: 'ターン終了時',
  passive: '常時効果',
  on_ally_death: '味方が死亡した時',
  on_damage_taken: 'ダメージを受けた時',
  on_attack: '攻撃した時',
  on_spell_play: '呪文をプレイした時',
};

function getTurnNumberForAction(
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

  switch (action.type) {
    case "energy_update": {
      const { maxEnergyBefore, maxEnergyAfter } = action.data;
      return {
        type: 'energy_update',
        iconName: 'Zap',
        playerName,
        message: `最大エネルギー +1`,
        details: `(${maxEnergyBefore} → ${maxEnergyAfter})、全回復`,
        cardIds: [],
      };
    }
    case "card_play": {
      const card = getCardById(action.data.cardId);
      return {
        type: 'card_play',
        iconName: 'CreditCard',
        playerName,
        message: `《${card?.name || action.data.cardId}》を配置`,
        details: `(コスト${card?.cost || "?"})`,
        cardIds: [action.data.cardId],
      };
    }
    case "card_attack": {
      const { data } = action;
      const attackerName = getCardName(data.attackerCardId);
      const isPlayerTarget = data.targetId === "player1" || data.targetId === "player2";
      const targetName = isPlayerTarget ? getPlayerName(data.targetId as PlayerId) : `《${getCardName(data.targetId)}》`;
      
      let details = `(${data.damage}ダメージ)`;
      if (data.targetHealth) {
        details += ` 体力 ${data.targetHealth.before}→${data.targetHealth.after}`;
      } else if (data.targetPlayerLife) {
        details += ` ライフ ${data.targetPlayerLife.before}→${data.targetPlayerLife.after}`;
      }

      return {
        type: 'card_attack',
        iconName: 'Swords',
        playerName,
        message: `《${attackerName}》 → ${targetName}`,
        details: details,
        cardIds: [data.attackerCardId, data.targetId],
      };
    }
    case "creature_destroyed": {
      const { destroyedCardId, source, sourceCardId } = action.data;
      let sourceText = "";
      if (source === 'combat') sourceText = "戦闘";
      else if (source === 'effect' && sourceCardId) sourceText = `${getSourceDisplayName(sourceCardId)}の効果`;
      return {
        type: 'creature_destroyed',
        iconName: 'ShieldOff',
        playerName,
        message: `《${getCardName(destroyedCardId)}》破壊`,
        details: `(${sourceText}により)`,
        cardIds: [destroyedCardId],
      };
    }
    case "effect_trigger": {
      const { data } = action;
      const sourceCardName = getSourceDisplayName(data.sourceCardId);

      const detailsParts = Object.entries(data.targets).map(([targetId, valueChange]) => {
        const targetName = (targetId === 'player1' || targetId === 'player2') ? getPlayerName(targetId as PlayerId) : `《${getCardName(targetId)}》`;
        const changes = [];
        if (valueChange.attack) {
          const diff = valueChange.attack.after - valueChange.attack.before;
          changes.push(`攻撃力 ${valueChange.attack.before}→${valueChange.attack.after} (${diff >= 0 ? '+' : ''}${diff})`);
        }
        if (valueChange.health) {
          const diff = valueChange.health.after - valueChange.health.before;
          changes.push(`体力 ${valueChange.health.before}→${valueChange.health.after} (${diff >= 0 ? '+' : ''}${diff})`);
        }
        if (valueChange.life) {
          const diff = valueChange.life.after - valueChange.life.before;
          changes.push(`ライフ ${valueChange.life.before}→${valueChange.life.after} (${diff >= 0 ? '+' : ''}${diff})`);
        }
        
        if (changes.length === 0) {
          const effectName = EFFECT_NAMES[data.effectType] || data.effectType;
          // readyアクションの場合は特別なテキストを生成
          if (data.effectType === 'ready') {
            return `${targetName}が${effectName}になった`;
          }
          return `${targetName}に${effectName}(${data.effectValue})`;
        }
        return `${targetName} ${changes.join(', ')}`;
      });

      return {
        type: 'effect_trigger',
        iconName: 'Sparkles',
        playerName,
        message: `${sourceCardName}の効果`,
        details: detailsParts.join('; '),
        cardIds: [data.sourceCardId, ...Object.keys(data.targets)],
      };
    }
    case "phase_change": {
      if (action.data.toPhase === "draw") {
        const turnNumber = getTurnNumberForAction(action, gameState);
        return {
          type: 'phase_change',
          iconName: 'RotateCcw',
          playerName,
          message: `ターン${turnNumber}開始 - ${playerName}のターン`,
          cardIds: [],
        };
      }
      const phaseName = PHASE_NAMES[action.data.toPhase] || action.data.toPhase;
      return {
        type: 'phase_change',
        iconName: 'Flag',
        playerName,
        message: `${phaseName}フェーズ`,
        cardIds: [],
      };
    }
    case "trigger_event": {
      const { triggerType, sourceCardId, targetCardId } = action.data;
      const triggerName = TRIGGER_TYPE_NAMES[triggerType] || '不明なトリガー';
      const message = targetCardId
        ? `《${getCardName(targetCardId)}》の効果が発動`
        : `効果が発動`;
      
      return {
        type: 'trigger_event',
        iconName: 'Zap',
        playerName,
        message,
        triggerText: triggerName,
        cardIds: [sourceCardId, targetCardId].filter((id): id is string => !!id),
      };
    }
    case "keyword_trigger": {
      const { keyword, sourceCardId, targetId, value } = action.data;
      const sourceName = getCardName(sourceCardId);
      const isPlayerTarget = targetId === "player1" || targetId === "player2";
      const targetName = isPlayerTarget ? getPlayerName(targetId as PlayerId) : `《${getCardName(targetId)}》`;
      const keywordName = KEYWORD_NAMES[keyword] || keyword;

      return {
        type: 'keyword_trigger',
        iconName: 'Star',
        playerName,
        message: `《${sourceName}》の${keywordName}効果 → ${targetName}`,
        details: `(${value}追加ダメージ)`,
        cardIds: [sourceCardId, targetId],
      };
    }
    default: {
      const exhaustiveCheck: never = action;
      return {
        type: 'card_play', // fallback
        iconName: 'AlertTriangle',
        playerName: 'システム',
        message: '不明なアクション',
        cardIds: [],
      };
    }
  }
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
 * 決定打アクションを特定する関数
 */
export function findDecisiveAction(gameState: GameState): GameAction | null {
  if (!gameState.result || gameState.result.reason !== "life_zero") return null;

  // 最後のライフダメージを与えたアクションを逆順検索
  for (let i = gameState.actionLog.length - 1; i >= 0; i--) {
    const action = gameState.actionLog[i];
    if (action.type === "card_attack") {
      const isPlayerTarget =
        action.data.targetId === "player1" || action.data.targetId === "player2";
      if (isPlayerTarget && action.data.damage > 0) {
        return action;
      }
    }
    if (action.type === "effect_trigger" && action.data.effectType === "damage") {
      const hasLifeDamage = Object.values(action.data.targets).some(
        (t) => t.life && t.life.before > t.life.after
      );
      if (hasLifeDamage) {
        return action;
      }
    }
  }
  return null;
}
