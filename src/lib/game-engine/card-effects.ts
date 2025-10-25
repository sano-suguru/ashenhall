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
  EffectTrigger,
  EffectTarget,
} from "@/types/game";
import type { ConditionalEffect } from "@/types/cards";

import { SeededRandom } from "./seeded-random";
import {
  addTriggerEventAction,
  addCreatureDestroyedAction,
} from "./action-logger";
import {
  effectHandlers,
  resolveDynamicEffectParameters,
} from "./effect-registry";
import { selectTargets, checkEffectCondition } from "./core/game-logic-utils";
import { filterTargets } from "./core/target-filter";
import { evaluatePendingDeaths } from './death-sweeper';

/**
 * 条件分岐効果の実行
 */
function executeConditionalEffect(
  state: GameState,
  conditionalEffect: ConditionalEffect,
  sourceCard: Card,
  sourcePlayerId: PlayerId
): void {
  try {
    const conditionMet = checkEffectCondition(
      state,
      sourcePlayerId,
      conditionalEffect.condition
    );
    
    const effectsToExecute = conditionMet 
      ? conditionalEffect.ifTrue 
      : conditionalEffect.ifFalse;
    
    // 選択された効果群を順次実行
    effectsToExecute.forEach((effect: CardEffect) => {
      executeCardEffectWithoutConditionCheck(state, effect, sourceCard, sourcePlayerId);
    });
  } catch (error) {
    console.error(`Error executing conditional effect:`, error);
  }
}

/**
 * クリーチャー死亡処理（統一アクションシステム互換版）
 * 
 * 統一アクションシステムと同じロジックで動作し、テスト互換性を保持
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
  const cardIndexOnField = player.field.findIndex(c => c.instanceId === deadCard.instanceId);
  if (cardIndexOnField === -1) {
    return;
  }

  // 破壊ログを記録
  addCreatureDestroyedAction(state, ownerId, {
    destroyedCardId: deadCard.templateId,
    source,
    sourceCardId,
  });

  // 死亡したカード自身の`on_death`効果を発動
  processEffectTrigger(state, "on_death", deadCard, ownerId, deadCard);

  // 場から取り除き、墓地へ送る
  const [removedCard] = player.field.splice(cardIndexOnField, 1);
  player.graveyard.push(removedCard);

  // 他の味方の`on_ally_death`効果を発動
  processEffectTrigger(state, "on_ally_death", undefined, ownerId, removedCard);

  // 場のカードの位置を再インデックス
  player.field.forEach((c, i) => (c.position = i));
}

/**
 * 条件判定なしで単一カード効果を実行（内部使用）
 */
const RANDOM_TARGETS: EffectTarget[] = ["enemy_random", "ally_random"];

function isRandomTarget(target: EffectTarget): boolean {
  return RANDOM_TARGETS.includes(target);
}

function determineInitialTargets(
  state: GameState,
  effect: CardEffect,
  sourceCard: Card,
  sourcePlayerId: PlayerId,
  random: SeededRandom
): FieldCard[] {
  let initialTargets = selectTargets(state, sourcePlayerId, effect.target, random);

  if (effect.target === "self" && sourceCard.type === "creature") {
    const fieldCard = state.players[sourcePlayerId].field.find(
      (card) => card.templateId === sourceCard.templateId
    );
    if (fieldCard) {
      initialTargets = [fieldCard];
    }
  }

  return initialTargets;
}

function collectRandomTargetCandidates(
  state: GameState,
  sourcePlayerId: PlayerId,
  targetType: EffectTarget
): FieldCard[] {
  const opponentId: PlayerId = sourcePlayerId === "player1" ? "player2" : "player1";

  if (targetType === "enemy_random") {
    return state.players[opponentId].field.filter(
      (card) => card.currentHealth > 0 && !card.keywords.includes("untargetable")
    );
  }

  return state.players[sourcePlayerId].field.filter((card) => card.currentHealth > 0);
}

function applySelectionRulesToTargets(
  state: GameState,
  effect: CardEffect,
  sourceCard: Card,
  sourcePlayerId: PlayerId,
  random: SeededRandom,
  currentTargets: FieldCard[]
): FieldCard[] {
  const { selectionRules, target } = effect;
  if (!selectionRules) {
    return currentTargets;
  }

  if (isRandomTarget(target)) {
    const candidates = collectRandomTargetCandidates(state, sourcePlayerId, target);
    const filteredCandidates = filterTargets(
      candidates,
      selectionRules,
      sourceCard.templateId
    );
    const selectedTarget = random.choice(filteredCandidates);
    return selectedTarget ? [selectedTarget] : [];
  }

  return filterTargets(
    currentTargets,
    selectionRules,
    sourceCard.templateId
  );
}

function executeCardEffectWithoutConditionCheck(
  state: GameState,
  effect: CardEffect,
  sourceCard: Card,
  sourcePlayerId: PlayerId
): void {
  try {
    const random = new SeededRandom(
      state.randomSeed + state.turnNumber + sourceCard.templateId
    );

    const initialTargets = determineInitialTargets(
      state,
      effect,
      sourceCard,
      sourcePlayerId,
      random
    );
    const targetsAfterSelection = applySelectionRulesToTargets(
      state,
      effect,
      sourceCard,
      sourcePlayerId,
      random,
      initialTargets
    );

    const { value, targets } = resolveDynamicEffectParameters(
      state,
      effect,
      sourceCard,
      sourcePlayerId,
      targetsAfterSelection
    );

    if (effect.conditionalEffect) {
      executeConditionalEffect(state, effect.conditionalEffect, sourceCard, sourcePlayerId);
    } else {
      const handler = effectHandlers[effect.action];
      if (handler) {
        handler(state, effect, sourceCard, sourcePlayerId, random, targets, value);
      }
    }
  } catch (error) {
    console.error(`Error executing card effect:`, error);
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
    // 0. 効果発動条件を判定
    const activationCondition = effect.activationCondition;
    if (!checkEffectCondition(state, sourcePlayerId, activationCondition)) {
      return; // 条件を満たさない場合は効果を実行しない
    }

    // 条件を満たす場合は条件判定なしの関数を呼び出す
    executeCardEffectWithoutConditionCheck(state, effect, sourceCard, sourcePlayerId);
  } catch (error) {
    console.error(`Error executing card effect:`, error);
  }
}

/**
 * カードの全効果を実行
 */
export function executeAllCardEffects(
  state: GameState,
  sourceCard: Card,
  sourcePlayerId: PlayerId,
  trigger: string
): void {
  try {
    const effectsToExecute = sourceCard.effects.filter(
      (effect) => effect.trigger === trigger
    );

    // 効果実行前の初期状態で全発動条件を判定
    const effectConditions = effectsToExecute.map((effect) => ({
      effect,
      shouldExecute: checkEffectCondition(state, sourcePlayerId, effect.activationCondition),
    }));

    // 条件を満たす効果のみを順番に実行
    effectConditions.forEach(({ effect, shouldExecute }) => {
      if (shouldExecute) {
        executeCardEffectWithoutConditionCheck(state, effect, sourceCard, sourcePlayerId);
      }
    });
  } catch (error) {
    console.error(`Error executing all card effects:`, error);
  }
}

type TriggerHandler = (
  state: GameState,
  trigger: EffectTrigger,
  sourceCard?: FieldCard | Card,
  sourcePlayerId?: PlayerId,
  triggeringCard?: FieldCard | Card
) => void;

const processCardsEffects = (
  state: GameState,
  cards: FieldCard[],
  playerId: PlayerId,
  trigger: EffectTrigger
) => {
  cards.forEach((card) => {
    if (card.isSilenced) return;
    const effectsToExecute = card.effects.filter(
      (effect) => effect.trigger === trigger
    );
    effectsToExecute.forEach((effect) => {
      executeCardEffect(state, effect, card, playerId);
    });
  });
};

function handleSingleCardTrigger(
  state: GameState,
  trigger: EffectTrigger,
  sourceCard?: FieldCard | Card,
  sourcePlayerId?: PlayerId,
  triggeringCard?: FieldCard | Card
): void {
  if (!sourceCard || !sourcePlayerId) return;

  const effectsToExecute = sourceCard.effects.filter(
    (effect) => effect.trigger === trigger
  );

  if (effectsToExecute.length > 0) {
    addTriggerEventAction(state, sourcePlayerId, {
      triggerType: trigger,
      sourceCardId: triggeringCard?.templateId,
      targetCardId: sourceCard.templateId,
    });
  }

  // 新しい関数を使用して条件を事前に判定
  executeAllCardEffects(state, sourceCard, sourcePlayerId, trigger);
}

function handlePlayerScopedTrigger(
  state: GameState,
  trigger: EffectTrigger,
  _sourceCard?: FieldCard | Card,
  sourcePlayerId?: PlayerId
): void {
  if (!sourcePlayerId) return;

  processCardsEffects(
    state,
    state.players[sourcePlayerId].field,
    sourcePlayerId,
    trigger
  );
}

function handleGlobalTrigger(
  state: GameState,
  trigger: EffectTrigger
): void {
  processCardsEffects(state, state.players.player1.field, "player1", trigger);
  processCardsEffects(state, state.players.player2.field, "player2", trigger);
}

const triggerHandlers: Partial<Record<EffectTrigger, TriggerHandler>> = {
  on_play: handleSingleCardTrigger,
  on_death: handleSingleCardTrigger,
  on_damage_taken: handleSingleCardTrigger,
  on_attack: handleSingleCardTrigger,
  on_spell_play: handlePlayerScopedTrigger,
  on_ally_death: handlePlayerScopedTrigger,
};

/**
 * 指定タイミングでの効果発動処理
 */
export function processEffectTrigger(
  state: GameState,
  trigger: EffectTrigger,
  sourceCard?: FieldCard | Card,
  sourcePlayerId?: PlayerId,
  triggeringCard?: FieldCard | Card
): void {
  const handler = triggerHandlers[trigger] || handleGlobalTrigger;
  handler(state, trigger, sourceCard, sourcePlayerId, triggeringCard);
  // トリガー内で複数効果がチェーンし別ユニットが HP0 になったケースを回収
  evaluatePendingDeaths(state, 'trigger', sourceCard?.templateId || triggeringCard?.templateId);
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
        card.currentHealth = Math.max(0, card.currentHealth - card.passiveHealthModifier);
      }

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
  // パッシブ再適用後に 0 HP へ落ちたカードを処理
  evaluatePendingDeaths(state, 'passive');
}
