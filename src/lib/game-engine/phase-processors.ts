/**
 * Ashenhall フェーズ処理システム
 * 
 * 設計方針:
 * - 各フェーズの処理を独立した関数として実装
 * - AI配置ロジックとカード効果処理の統合
 * - 決定論的な処理順序の保証
 */

import type {
  GameState,
  PlayerId,
  FieldCard,
} from "@/types/game";
import { GAME_CONSTANTS } from "@/types/game";
import { advancePhase } from "./game-state";
import {
  addEffectTriggerAction,
  addEnergyUpdateAction,
  addCardPlayAction,
} from "./action-logger";
import {
  applyPassiveEffects,
  processEffectTrigger,
  handleCreatureDeath,
} from "./card-effects";
import { evaluateCardForPlay } from "./ai-tactics";
import { checkAllConditions } from "./core/condition-checker";
import type { Card } from "@/types/game";

/**
 * カードがプレイ可能かどうかをチェックする（プレイ条件含む）
 */
function canPlayCard(card: Card, state: GameState, playerId: PlayerId): boolean {
  const player = state.players[playerId];
  
  // 基本条件: エネルギーとフィールド制限
  if (player.energy < card.cost) return false;
  if (card.type === "creature" && player.field.length >= GAME_CONSTANTS.FIELD_LIMIT) return false;
  
  // プレイ条件チェック（空打ち防止）
  if (card.playConditions && card.playConditions.length > 0) {
    return checkAllConditions(state, playerId, card.playConditions);
  }
  
  return true;
}

/**
 * カードを場に出す
 */
function playCardToField(
  state: GameState,
  playerId: PlayerId,
  cardId: string,
  position: number
): boolean {
  const player = state.players[playerId];
  const cardIndex = player.hand.findIndex((c) => c.id === cardId);

  if (cardIndex === -1) return false;
  const card = player.hand[cardIndex];

  // 統一されたプレイ可能性チェック
  if (!canPlayCard(card, state, playerId)) return false;

  if (card.type === "creature") {
    if (player.field.length >= GAME_CONSTANTS.FIELD_LIMIT) return false;
    if (position < 0 || position > player.field.length)
      position = player.field.length;
  }

  const energyBefore = player.energy;
  player.energy -= card.cost;
  const energyAfter = player.energy;

  player.hand.splice(cardIndex, 1);

  if (card.type === "creature") {
    const fieldCard: FieldCard = {
      ...card,
      owner: playerId,
      currentHealth: card.health,
      attackModifier: 0,
      healthModifier: 0,
      passiveAttackModifier: 0,
      passiveHealthModifier: 0,
      summonTurn: state.turnNumber,
      position,
      hasAttacked: false,
      isStealthed: card.keywords.includes("stealth"),
      isSilenced: false,
      statusEffects: [],
      readiedThisTurn: false,
    };
    player.field.splice(position, 0, fieldCard);
    player.field.forEach((c, i) => (c.position = i));
    addCardPlayAction(state, playerId, {
      cardId: card.id,
      position,
      initialStats: { attack: card.attack, health: card.health },
      playerEnergy: { before: energyBefore, after: energyAfter },
    });
    processEffectTrigger(state, "on_play", fieldCard, playerId, fieldCard);
  } else if (card.type === "spell") {
    player.graveyard.push(card); // Move to graveyard before resolving effects
    addCardPlayAction(state, playerId, {
      cardId: card.id,
      position: -1,
      playerEnergy: { before: energyBefore, after: energyAfter },
    });
    processEffectTrigger(state, "on_play", card, playerId, card);
    processEffectTrigger(state, "on_spell_play", undefined, playerId, card);
  }

  return true;
}

/**
 * ドローフェーズの処理
 */
export function processDrawPhase(state: GameState): void {
  const player = state.players[state.currentPlayer];

  // 手札上限チェック
  if (player.hand.length >= GAME_CONSTANTS.HAND_LIMIT) {
    advancePhase(state);
    return;
  }

  // デッキからカードをドロー
  if (player.deck.length > 0) {
    const drawnCard = player.deck.pop()!;
    player.hand.push(drawnCard);
  } else {
    // デッキ切れダメージ
    const lifeBefore = player.life;
    player.life -= 1;
    const lifeAfter = player.life;
    addEffectTriggerAction(state, state.currentPlayer, {
      sourceCardId: "deck_empty",
      effectType: "damage",
      effectValue: 1,
      targets: {
        [state.currentPlayer]: {
          life: { before: lifeBefore, after: lifeAfter },
        },
      },
    });
  }

  advancePhase(state);
}

/**
 * エネルギーフェーズの処理
 * 新仕様: 毎ターン最大エネルギーが1増加（上限8）、毎ターン上限まで回復
 */
export function processEnergyPhase(state: GameState): void {
  const player = state.players[state.currentPlayer];
  const maxEnergyBefore = player.maxEnergy;
  const maxEnergyAfter = Math.min(
    player.maxEnergy + 1,
    GAME_CONSTANTS.ENERGY_LIMIT
  );

  if (maxEnergyAfter > maxEnergyBefore) {
    player.maxEnergy = maxEnergyAfter;
    addEnergyUpdateAction(state, state.currentPlayer, {
      maxEnergyBefore,
      maxEnergyAfter,
    });
  }

  // エネルギーを上限まで回復
  player.energy = player.maxEnergy;

  advancePhase(state);
}

/**
 * 配置フェーズの処理（AI自動配置）
 * 完全実装: エネルギー上限まで配置可能、自然な制約で最適化
 */
export function processDeployPhase(state: GameState): void {
  applyPassiveEffects(state);
  const player = state.players[state.currentPlayer];
  
  // 注意: 現在のAI配置ロジックは決定論的評価スコアを使用
  // 将来的にランダム性が必要な場合は以下を有効化:
  // const random = new SeededRandom(state.randomSeed + state.turnNumber);

  // 無限ループ防止: 理論的最大配置数（場の上限5 + 安全マージン）
  const MAX_DEPLOYMENT_ATTEMPTS = 10;
  let deploymentAttempts = 0;

  // 完全実装: エネルギーと場の制約内で最大配置
  while (deploymentAttempts < MAX_DEPLOYMENT_ATTEMPTS) {
    deploymentAttempts++;

    // 配置可能なカードを再評価（エネルギー・場・プレイ条件を含む）
    const playableCards = player.hand.filter(
      (card) => canPlayCard(card, state, state.currentPlayer)
    );

    // 配置可能なカードがない場合は終了
    if (playableCards.length === 0) {
      break;
    }

    // 戦術タイプに応じてカードを評価
    const evaluatedCards = playableCards
      .map((card) => ({
        card,
        score: evaluateCardForPlay(card, state, state.currentPlayer),
      }))
      .sort((a, b) => b.score - a.score);

    // 最も評価の高いカードを配置
    const bestCard = evaluatedCards[0].card;
    const position = player.field.length; // 最後尾に配置

    // カードを配置
    const success = playCardToField(
      state,
      state.currentPlayer,
      bestCard.id,
      position
    );

    if (!success) {
      // 配置に失敗した場合は終了（予期しない状況）
      break;
    }
    // 成功した場合は次のカードの配置を試行
  }

  advancePhase(state);
}

/**
 * 終了フェーズの処理（新キーワード対応版）
 */
export function processEndPhase(state: GameState): void {
  const currentPlayer = state.players[state.currentPlayer];
  const opponent =
    state.players[state.currentPlayer === "player1" ? "player2" : "player1"];

  [currentPlayer, opponent].forEach((player) => {
    const poisonDeaths: FieldCard[] = [];
    player.field.forEach((card) => {
      // 状態異常処理
      card.statusEffects.forEach((effect) => {
        if (effect.type === "poison") {
          const healthBefore = card.currentHealth;
          card.currentHealth -= effect.damage;
          const healthAfter = card.currentHealth;
          addEffectTriggerAction(state, player.id, {
            sourceCardId: "poison_effect",
            effectType: "damage",
            effectValue: effect.damage,
            targets: {
              [card.id]: {
                health: { before: healthBefore, after: healthAfter },
              },
            },
          });
          if (card.currentHealth <= 0) {
            poisonDeaths.push(card);
          }
        }
        if ('duration' in effect) {
          effect.duration -= 1;
        }
      });

      // 潜伏解除と状態異常のクリーンアップ
      card.isStealthed = false;
      card.hasAttacked = false;
      card.readiedThisTurn = false; // 再攻撃準備フラグをリセット
      card.statusEffects = card.statusEffects.filter((e) => !('duration' in e) || e.duration > 0);
    });

    // 毒による死亡処理
    poisonDeaths.forEach(deadCard => {
      handleCreatureDeath(state, deadCard, 'effect', 'poison_effect');
    });
  });

  // ターン終了効果
  processEffectTrigger(state, "turn_end");

  advancePhase(state);
}
