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
  ValueChange,
  EffectTrigger,
} from "@/types/game";

import { SeededRandom } from "./seeded-random";
import {
  addEffectTriggerAction as addEffectTriggerActionFromLogger,
  addTriggerEventAction,
  addCreatureDestroyedAction,
} from "./action-logger";
import {
  effectHandlers,
  specialEffectHandlers,
  resolveDynamicEffectParameters,
} from "./effect-registry";
import { getBrandedEnemies } from "./brand-utils";
import { selectTargets } from "./core/target-selector";
import { checkEffectCondition } from "./core/condition-checker";

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
  processEffectTrigger(state, "on_ally_death", undefined, ownerId, removedCard);

  // 場のカードの位置を再インデックス
  player.field.forEach((c, i) => (c.position = i));
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

    // 効果を順番に実行（条件判定は各効果で行う）
    effectsToExecute.forEach((effect) => {
      executeCardEffect(state, effect, sourceCard, sourcePlayerId);
    });
  } catch (error) {
    console.error(`Error executing all card effects:`, error);
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
    // 0. 条件判定を最初に実行
    if (!checkEffectCondition(state, sourcePlayerId, effect.condition)) {
      return; // 条件を満たさない場合は効果を実行しない
    }

    const random = new SeededRandom(
      state.randomSeed + state.turnNumber + sourceCard.id
    );

    // 1. 初期対象を選択
    let initialTargets = selectTargets(
      state,
      sourcePlayerId,
      effect.target,
      random
    );
    if (effect.target === "self" && sourceCard.type === "creature") {
      const fieldCard = state.players[sourcePlayerId].field.find(
        (c) => c.id === sourceCard.id
      );
      if (fieldCard) {
        initialTargets = [fieldCard];
      }
    }

    // 2. 動的パラメータを解決
    const { value, targets } = resolveDynamicEffectParameters(
      state,
      effect,
      sourceCard,
      sourcePlayerId,
      initialTargets
    );

    // 3. 効果ハンドラを取得して実行
    if (effect.specialHandler && specialEffectHandlers[effect.specialHandler]) {
      // 特殊効果ハンドラーがある場合はそちらを実行
      const specialHandler = specialEffectHandlers[effect.specialHandler];
      specialHandler(state, effect, sourceCard, sourcePlayerId, random, targets, value);
    } else {
      // 通常の効果ハンドラーを実行
      const handler = effectHandlers[effect.action];
      if (handler) {
        handler(state, effect, sourceCard, sourcePlayerId, random, targets, value);
      }
    }
  } catch (error) {
    console.error(`Error executing card effect:`, error);
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
      sourceCardId: triggeringCard?.id,
      targetCardId: sourceCard.id,
    });
  }

  // 新しい関数を使用して条件を事前に判定
  executeAllCardEffects(state, sourceCard, sourcePlayerId, trigger);
}

function handlePlayerScopedTrigger(
  state: GameState,
  trigger: EffectTrigger,
  sourceCard?: FieldCard | Card,
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
