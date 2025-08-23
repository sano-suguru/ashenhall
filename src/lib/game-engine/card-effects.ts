/**
 * カード効果処理システム
 *
 * 設計方針:
 * - 各効果を独立したテスト可能な関数として実装
 * - エラーハンドリングを全箇所で実装
 * - 決定論的な効果処理（同条件なら同結果）
 */

import type {
  GameState,
  Card,
  FieldCard,
  CardEffect,
  PlayerId,
  EffectAction,
  EffectTarget,
  GameAction,
  ValueChange,
  TriggerEventActionData,
  EffectTrigger,
  CreatureDestroyedActionData,
} from "@/types/game";

import { SeededRandom } from "./seeded-random";
import {
  addEffectTriggerAction as addEffectTriggerActionFromLogger,
  addTriggerEventAction,
  addCreatureDestroyedAction,
} from "./action-logger";
import {
  executeDamageEffect,
  executeHealEffect,
} from "./effects/base-effects";
import {
  executeBuffAttackEffect,
  executeBuffHealthEffect,
  executeDebuffAttackEffect,
  executeDebuffHealthEffect,
} from "./effects/modifier-effects";
import {
  executeSummonEffect,
  executeResurrectEffect,
} from "./effects/summon-effects";
import {
  executeSilenceEffect,
  executeReadyEffect,
  executeStunEffect,
  executeDrawCardEffect,
} from "./effects/status-effects";
import {
  executeDestroyDeckTopEffect,
  executeSwapAttackHealthEffect,
  executeHandDiscardEffect,
  executeDestroyAllCreaturesEffect,
} from "./effects/special-effects";

/**
 * 効果ログを追加（既存コードとの互換性を保つ）
 */
function addEffectTriggerAction(
  state: GameState,
  sourceCardId: string,
  effectType: EffectAction,
  effectValue: number,
  targets: Record<string, ValueChange>
): void {
  addEffectTriggerActionFromLogger(state, state.currentPlayer, {
    sourceCardId,
    effectType,
    effectValue,
    targets,
  });
}

/**
 * クリーチャー死亡処理を一元化
 */
export function handleCreatureDeath(
  state: GameState,
  deadCard: FieldCard,
  source: 'combat' | 'effect',
  sourceCardId: string
): void {
  const ownerId = deadCard.owner;
  const player = state.players[ownerId];

  // 既に場からいなくなっている場合は処理しない
  const cardIndexOnField = player.field.findIndex(c => c.id === deadCard.id);
  if (cardIndexOnField === -1) {
    return;
  }

  // 破壊ログを記録
  addCreatureDestroyedAction(state, ownerId, {
    destroyedCardId: deadCard.id,
    source,
    sourceCardId,
  });

  // 死亡したカード自身の`on_death`効果を発動
  processEffectTrigger(state, "on_death", deadCard, ownerId, deadCard);

  // 場から取り除き、墓地へ送る
  const [removedCard] = player.field.splice(cardIndexOnField, 1);
  player.graveyard.push(removedCard);

  // 他の味方の`on_ally_death`効果を発動
  player.field.forEach((allyCard) => {
    processEffectTrigger(state, "on_ally_death", allyCard, ownerId, removedCard);
  });

  // 場のカードの位置を再インデックス
  player.field.forEach((c, i) => (c.position = i));
}

/**
 * 対象選択ロジック
 */
function selectTargets(
  state: GameState,
  sourcePlayerId: PlayerId,
  targetType: EffectTarget,
  random: SeededRandom
): FieldCard[] {
  const sourcePlayer = state.players[sourcePlayerId];
  const opponentId: PlayerId =
    sourcePlayerId === "player1" ? "player2" : "player1";
  const opponent = state.players[opponentId];

  switch (targetType) {
    case "self":
      // 効果発動者自身は特別処理が必要（場にいない可能性）
      return [];

    case "ally_all":
      return [...sourcePlayer.field].filter((card) => card.currentHealth > 0);

    case "enemy_all":
      return [...opponent.field].filter((card) => card.currentHealth > 0);

    case "ally_random":
      const allyTargets = sourcePlayer.field.filter(
        (card) => card.currentHealth > 0
      );
      const randomAlly = random.choice(allyTargets);
      return randomAlly ? [randomAlly] : [];

    case "enemy_random":
      const enemyTargets = opponent.field.filter(
        (card) => card.currentHealth > 0
      );
      const randomEnemy = random.choice(enemyTargets);
      return randomEnemy ? [randomEnemy] : [];

    case "player":
      // プレイヤー対象は別処理
      return [];

    default:
      return [];
  }
}

/**
 * ダメージ効果の処理
 */
function applyDamage(
  state: GameState,
  targets: FieldCard[],
  targetPlayerId: PlayerId | null,
  damage: number,
  sourceCardId: string
): void {
  const valueChanges: Record<string, ValueChange> = {};

  targets.forEach((target) => {
    const before = target.currentHealth;
    target.currentHealth = Math.max(0, target.currentHealth - damage);
    const after = target.currentHealth;
    valueChanges[target.id] = { health: { before, after } };
  });

  if (targetPlayerId) {
    const player = state.players[targetPlayerId];
    const before = player.life;
    player.life = Math.max(0, player.life - damage);
    const after = player.life;
    valueChanges[targetPlayerId] = { life: { before, after } };
  }

  addEffectTriggerAction(state, sourceCardId, "damage", damage, valueChanges);

  // ダメージ適用後に死亡判定
  targets.forEach((target) => {
    if (target.currentHealth <= 0) {
      handleCreatureDeath(state, target, 'effect', sourceCardId);
    }
  });
}



/**
 * 効果の発動条件を判定する
 */
function checkEffectCondition(
  state: GameState,
  sourcePlayerId: PlayerId,
  condition: import("@/types/game").EffectCondition | undefined
): boolean {
  if (!condition) {
    return true; // 条件がなければ常にtrue
  }

  const player = state.players[sourcePlayerId];
  const opponent =
    state.players[sourcePlayerId === "player1" ? "player2" : "player1"];

  let subjectValue: number;

  switch (condition.subject) {
    case "graveyard":
      subjectValue = player.graveyard.length;
      break;
    case "allyCount":
      subjectValue = player.field.length;
      break;
    case "playerLife":
      subjectValue = player.life;
      break;
    case "opponentLife":
      subjectValue = opponent.life;
      break;
    default:
      return true; // 不明な subject は true
  }

  const compareValue =
    condition.value === "opponentLife" ? opponent.life : condition.value;

  switch (condition.operator) {
    case "gte":
      return subjectValue >= compareValue;
    case "lte":
      return subjectValue <= compareValue;
    case "lt":
      return subjectValue < compareValue;
    case "gt":
      return subjectValue > compareValue;
    case "eq":
      return subjectValue === compareValue;
    default:
      return true; // 不明な operator は true
  }
}

/**
 * 単一カード効果の実行
 */
export function executeCardEffect(
  state: GameState,
  effect: CardEffect,
  sourceCard: Card,
  sourcePlayerId: PlayerId
): void {
  try {
    const random = new SeededRandom(
      state.randomSeed + state.turnNumber + sourceCard.id
    );
    let targets = selectTargets(state, sourcePlayerId, effect.target, random);
    let value = effect.value;
    const sourcePlayer = state.players[sourcePlayerId];
    const opponentId: PlayerId =
      sourcePlayerId === "player1" ? "player2" : "player1";

    // --- 動的な効果値や対象を解決（既存ID分岐を維持）---
    if (
      sourceCard.id === "necro_grave_giant" &&
      effect.action === "buff_attack"
    ) {
      value = sourcePlayer.graveyard.filter(
        (c) => c.type === "creature"
      ).length;
    }
    if (sourceCard.id === "kni_sanctuary_prayer" && effect.action === "heal") {
      value = sourcePlayer.field.filter((c) => c.currentHealth > 0).length;
    }
    if (
      sourceCard.id === "kni_white_wing_marshal" &&
      effect.target === "ally_all"
    ) {
      targets = targets.filter((t) => t.id !== sourceCard.id); // 自分自身を除く
    }

    if (effect.target === "self" && sourceCard.type === "creature") {
      const fieldCard = state.players[sourcePlayerId].field.find(
        (c) => c.id === sourceCard.id
      );
      if (fieldCard) {
        targets = [fieldCard];
      }
    }

    switch (effect.action) {
      case "damage":
        if (effect.target === "player") {
          executeDamageEffect(state, [], opponentId, value, sourceCard.id, sourceCard, random);
        } else {
          executeDamageEffect(state, targets, null, value, sourceCard.id, sourceCard, random);
        }
        break;

      case "heal":
        if (effect.target === "player") {
          executeHealEffect(state, [], sourcePlayerId, value, sourceCard.id);
        } else {
          executeHealEffect(state, targets, null, value, sourceCard.id);
        }
        break;

      case "buff_attack":
        executeBuffAttackEffect(state, targets, value, sourceCard.id, effect);
        break;

      case "buff_health":
        executeBuffHealthEffect(state, targets, value, sourceCard.id, effect);
        break;

      case "debuff_attack":
        executeDebuffAttackEffect(state, targets, value, sourceCard.id);
        break;

      case "debuff_health":
        executeDebuffHealthEffect(state, targets, value, sourceCard.id);
        break;

      case "summon":
        executeSummonEffect(state, sourcePlayerId, sourceCard, random, value);
        break;

      case "draw_card":
        executeDrawCardEffect(state, sourcePlayerId, value, sourceCard.id);
        break;

      case "silence":
        executeSilenceEffect(state, targets, sourceCard.id);
        break;

      case "resurrect":
        executeResurrectEffect(state, sourcePlayerId, sourceCard, random, value);
        break;

      case "stun":
        executeStunEffect(state, targets, value, sourceCard.id);
        break;

      case "ready":
        executeReadyEffect(state, targets, sourceCard.id);
        break;

      case "destroy_deck_top":
        executeDestroyDeckTopEffect(state, sourcePlayerId, value, sourceCard.id);
        break;

      case "swap_attack_health":
        executeSwapAttackHealthEffect(state, targets, sourceCard.id);
        break;

      case "hand_discard":
        executeHandDiscardEffect(
          state,
          opponentId,
          value,
          sourceCard.id,
          random,
          effect.targetFilter
        );
        break;

      case "destroy_all_creatures":
        executeDestroyAllCreaturesEffect(state, sourceCard.id);
        break;

      default:
        break;
    }
  } catch (error) {
    console.error(`Error executing card effect:`, error);
  }
}

/**
 * 指定タイミングでの効果発動処理
 */
export function processEffectTrigger(
  state: GameState,
  trigger: EffectTrigger,
  sourceCard?: FieldCard | Card,
  sourcePlayerId?: PlayerId,
  // `on_damage_taken` のようなイベントで、トリガーのきっかけとなったカードを渡す
  triggeringCard?: FieldCard | Card
): void {
  const processCardsEffects = (
    cards: FieldCard[],
    playerId: PlayerId,
    triggerSourceCard?: FieldCard
  ) => {
    cards.forEach((card) => {
      if (card.isSilenced) return;
      const effectsToExecute = card.effects.filter(
        (effect) =>
          effect.trigger === trigger &&
          checkEffectCondition(state, playerId, effect.condition)
      );
      effectsToExecute.forEach((effect) => {
        executeCardEffect(state, effect, card, playerId);
      });
    });
  };

  if (
    (trigger === "on_play" || trigger === "on_death") &&
    sourceCard &&
    sourcePlayerId
  ) {
    const effectsToExecute = sourceCard.effects.filter(
      (effect) =>
        effect.trigger === trigger &&
        checkEffectCondition(state, sourcePlayerId, effect.condition)
    );
    // 効果が実際に存在する場合のみイベントログを記録
    if (effectsToExecute.length > 0 && sourcePlayerId && sourceCard) {
      addTriggerEventAction(state, sourcePlayerId, {
        triggerType: trigger,
        sourceCardId: triggeringCard?.id,
        targetCardId: sourceCard.id,
      });
    }
    effectsToExecute.forEach((effect) =>
      executeCardEffect(state, effect, sourceCard, sourcePlayerId)
    );
  } else if (trigger === "on_spell_play" && sourcePlayerId) {
    const opponentId: PlayerId =
      sourcePlayerId === "player1" ? "player2" : "player1";
    state.players[sourcePlayerId].field.forEach((card) => {
      if (card.id === "mag_chant_avatar" && !card.isSilenced) {
        applyDamage(state, [], opponentId, 1, card.id);
      }
    });
    processCardsEffects(state.players[sourcePlayerId].field, sourcePlayerId);
  } else if (trigger === "on_damage_taken" && sourceCard && sourcePlayerId) {
    if ("currentHealth" in sourceCard) {
      processCardsEffects(
        [sourceCard as FieldCard],
        sourcePlayerId,
        sourceCard as FieldCard
      );
    }
  } else if (trigger === "on_ally_death" && sourcePlayerId) {
    // 味方死亡時は全味方クリーチャーの効果をチェック
    processCardsEffects(state.players[sourcePlayerId].field, sourcePlayerId);
  } else {
    // turn_start, turn_end, on_ally_death etc.
    processCardsEffects(state.players.player1.field, "player1");
    processCardsEffects(state.players.player2.field, "player2");
  }
}

/**
 * パッシブ効果の適用
 * 注意: パッシブ効果は場に出ている間継続するため、
 * ゲーム状態計算時に毎回適用される
 */
export function applyPassiveEffects(state: GameState): void {
  // パッシブ効果をリセット（既存のパッシブ効果を除去）
  const resetPassiveModifiers = (cards: FieldCard[]) => {
    cards.forEach((card) => {
      // リセット前に現在の体力を調整
      if (card.passiveHealthModifier > 0) {
        card.currentHealth -= card.passiveHealthModifier;
      }
      // 負の値も考慮して0未満にならないように
      card.currentHealth = Math.max(0, card.currentHealth);

      card.passiveAttackModifier = 0;
      card.passiveHealthModifier = 0;
    });
  };

  // 全プレイヤーのパッシブ効果をリセット
  resetPassiveModifiers(state.players.player1.field);
  resetPassiveModifiers(state.players.player2.field);

  // パッシブ効果を再適用
  const applyPassiveForPlayer = (playerId: PlayerId) => {
    const player = state.players[playerId];
    player.field.forEach((card) => {
      if (card.isSilenced) return; // 沈黙状態のカードは効果を発動しない
      const passiveEffects = card.effects.filter(
        (effect) => effect.trigger === "passive"
      );
      passiveEffects.forEach((effect) => {
        executeCardEffect(state, effect, card, playerId);
      });
    });
  };

  applyPassiveForPlayer("player1");
  applyPassiveForPlayer("player2");
}
