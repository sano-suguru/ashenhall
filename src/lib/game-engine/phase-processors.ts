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
import { generateFieldCardInstanceId } from "./instance-id";
import { GAME_CONSTANTS } from "@/types/game";
import { advancePhase } from "./game-state";
import {
  addEffectTriggerAction,
  addEnergyUpdateAction,
  addCardPlayAction,
  addCardDrawAction,
  addEnergyRefillAction,
  addEndStageAction,
} from "./action-logger";
import { SYSTEM_EFFECT_SOURCES } from './system-effect-sources';
import {
  applyPassiveEffects,
  processEffectTrigger,
  handleCreatureDeath,
} from "./card-effects";
import { evaluateCardForPlay } from "./ai-tactics";
import { checkAllConditions } from "./core/game-logic-utils";
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
    // 一意インスタンスIDを生成
    const instanceId = generateFieldCardInstanceId(
      card.id,
      playerId,
      state.turnNumber,
      position
    );

    const fieldCard: FieldCard = {
      ...card,
      instanceId,
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
      instanceId,
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
    const handBefore = player.hand.length;
    player.hand.push(drawnCard);
    addCardDrawAction(state, state.currentPlayer, {
      cardId: drawnCard.id,
      handSizeBefore: handBefore,
      handSizeAfter: player.hand.length,
      deckSizeAfter: player.deck.length,
    });
  } else {
    // デッキ切れダメージ
    const lifeBefore = player.life;
    player.life -= 1;
    const lifeAfter = player.life;
    addCardDrawAction(state, state.currentPlayer, {
      cardId: SYSTEM_EFFECT_SOURCES.DECK_EMPTY,
      handSizeBefore: player.hand.length,
      handSizeAfter: player.hand.length, // 変化なし
      deckSizeAfter: player.deck.length,
      fatigue: { lifeBefore, lifeAfter }
    });
    addEffectTriggerAction(state, state.currentPlayer, {
      sourceCardId: SYSTEM_EFFECT_SOURCES.DECK_EMPTY,
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
  const before = player.energy;
  player.energy = player.maxEnergy;
  addEnergyRefillAction(state, state.currentPlayer, {
    energyBefore: before,
    energyAfter: player.energy,
    maxEnergy: player.maxEnergy,
  });

  advancePhase(state);
}

/**
 * 配置フェーズの処理（AI自動配置）
 * 修正版: 1カードずつ配置・演出完了待機方式
 */
export function processDeployPhase(state: GameState): void {
  applyPassiveEffects(state);
  const player = state.players[state.currentPlayer];
  
  // 配置可能なカードを評価（エネルギー・場・プレイ条件を含む）
  const playableCards = player.hand.filter(
    (card) => canPlayCard(card, state, state.currentPlayer)
  );

  // 配置可能なカードがない場合はフェーズ終了
  if (playableCards.length === 0) {
    advancePhase(state);
    return;
  }

  // 戦術タイプに応じてカードを評価
  const evaluatedCards = playableCards
    .map((card) => ({
      card,
      score: evaluateCardForPlay(card, state, state.currentPlayer),
    }))
    .sort((a, b) => b.score - a.score);

  // 最も評価の高いカードを1体のみ配置
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
    // 配置に失敗した場合はフェーズ終了（予期しない状況）
    advancePhase(state);
    return;
  }
  
  // 配置成功→フェーズ継続（advancePhaseしない）
  // 次のprocessGameStep呼び出しで再度processDeployPhaseが実行され、
  // 次のカードの配置を試行する
}

/**
 * 終了フェーズの処理（新キーワード対応版）
 */
export function processEndPhase(state: GameState): void {
  const currentPlayer = state.players[state.currentPlayer];
  const opponent =
    state.players[state.currentPlayer === "player1" ? "player2" : "player1"];

  // ステージ: status_tick
  addEndStageAction(state, state.currentPlayer, { stage: 'status_tick' });

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
            sourceCardId: SYSTEM_EFFECT_SOURCES.POISON,
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

    // 毒ダメージ適用完了後のステージ
    if (poisonDeaths.length > 0) {
      addEndStageAction(state, state.currentPlayer, { stage: 'poison_damage' });
    }
    poisonDeaths.forEach(deadCard => {
      handleCreatureDeath(state, deadCard, 'effect', SYSTEM_EFFECT_SOURCES.POISON);
    });
  });

  // クリーンアップステージ（stealth解除 / flags reset 後）
  addEndStageAction(state, state.currentPlayer, { stage: 'cleanup' });

  // ターン終了効果
  processEffectTrigger(state, "turn_end");
  addEndStageAction(state, state.currentPlayer, { stage: 'turn_end_trigger' });

  advancePhase(state);
}
