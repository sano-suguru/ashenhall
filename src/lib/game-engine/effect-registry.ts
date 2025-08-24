/**
 * 効果ハンドラの登録と動的パラメータ解決
 *
 * 設計方針:
 * - オープン・クローズドの原則に従い、効果の追加を容易にする
 * - カード固有のロジックを`executeCardEffect`から分離する
 */

import type {
  GameState,
  Card,
  FieldCard,
  CardEffect,
  PlayerId,
  EffectAction,
} from "@/types/game";
import { SeededRandom } from "./seeded-random";
import { getOpponentId } from "./effects/effect-types";

// 効果実行関数のインポート
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
 * 全ての効果ハンドラが従うべき関数シグネチャ
 */
export type EffectHandler = (
  state: GameState,
  effect: CardEffect,
  sourceCard: Card,
  sourcePlayerId: PlayerId,
  random: SeededRandom,
  targets: FieldCard[],
  value: number
) => void;

// prettier-ignore
export const effectHandlers: Partial<Record<EffectAction, EffectHandler>> = {
  'damage': (state, effect, sourceCard, sourcePlayerId, random, targets, value) => {
    const opponentId = getOpponentId(sourcePlayerId);
    if (effect.target === "player") {
      executeDamageEffect(state, [], opponentId, value, sourceCard.id, sourceCard, random);
    } else {
      executeDamageEffect(state, targets, null, value, sourceCard.id, sourceCard, random);
    }
  },
  'heal': (state, effect, sourceCard, sourcePlayerId, _random, targets, value) => {
    if (effect.target === "player") {
      executeHealEffect(state, [], sourcePlayerId, value, sourceCard.id);
    } else {
      executeHealEffect(state, targets, null, value, sourceCard.id);
    }
  },
  'buff_attack': (state, effect, sourceCard, _sp, _r, targets, value) => 
    executeBuffAttackEffect(state, targets, value, sourceCard.id, effect),
  'buff_health': (state, effect, sourceCard, _sp, _r, targets, value) => 
    executeBuffHealthEffect(state, targets, value, sourceCard.id, effect),
  'debuff_attack': (state, _e, sourceCard, _sp, _r, targets, value) => 
    executeDebuffAttackEffect(state, targets, value, sourceCard.id),
  'debuff_health': (state, _e, sourceCard, _sp, _r, targets, value) => 
    executeDebuffHealthEffect(state, targets, value, sourceCard.id),
  'summon': (state, _e, sourceCard, sourcePlayerId, random, _t, value) => 
    executeSummonEffect(state, sourcePlayerId, sourceCard, random, value),
  'draw_card': (state, _e, sourceCard, sourcePlayerId, _r, _t, value) => 
    executeDrawCardEffect(state, sourcePlayerId, value, sourceCard.id),
  'silence': (state, _e, sourceCard, _sp, _r, targets, _v) => 
    executeSilenceEffect(state, targets, sourceCard.id),
  'resurrect': (state, _e, sourceCard, sourcePlayerId, random, _t, value) => 
    executeResurrectEffect(state, sourcePlayerId, sourceCard, random, value),
  'stun': (state, _e, sourceCard, _sp, _r, targets, value) => 
    executeStunEffect(state, targets, value, sourceCard.id),
  'ready': (state, _e, sourceCard, _sp, _r, targets, _v) => 
    executeReadyEffect(state, targets, sourceCard.id),
  'destroy_deck_top': (state, _e, sourceCard, sourcePlayerId, _r, _t, value) => 
    executeDestroyDeckTopEffect(state, sourcePlayerId, value, sourceCard.id),
  'swap_attack_health': (state, _e, sourceCard, _sp, _r, targets, _v) => 
    executeSwapAttackHealthEffect(state, targets, sourceCard.id),
  'hand_discard': (state, effect, sourceCard, sourcePlayerId, random, _t, value) => {
    const opponentId = getOpponentId(sourcePlayerId);
    executeHandDiscardEffect(state, opponentId, value, sourceCard.id, random, effect.targetFilter);
  },
  'destroy_all_creatures': (state, _e, sourceCard, _sp, _r, _t, _v) => 
    executeDestroyAllCreaturesEffect(state, sourceCard.id),
};

/**
 * カード固有の動的な効果パラメータを解決する
 * @returns 解決済みの値と対象
 */
export function resolveDynamicEffectParameters(
  state: GameState,
  effect: CardEffect,
  sourceCard: Card,
  sourcePlayerId: PlayerId,
  initialTargets: FieldCard[]
): { value: number; targets: FieldCard[] } {
  let value = effect.value;
  let targets = initialTargets;
  const sourcePlayer = state.players[sourcePlayerId];

  // --- カード固有ロジック ---
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

  return { value, targets };
}
