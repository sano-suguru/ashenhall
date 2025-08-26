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
  executeApplyBrandEffect,
  executeDeckSearchEffect,
} from "./effects/status-effects";
import {
  executeDestroyDeckTopEffect,
  executeSwapAttackHealthEffect,
  executeHandDiscardEffect,
  executeDestroyAllCreaturesEffect,
  executeBanishEffect,
} from "./effects/special-effects";
import {
  getBrandedCreatureCount,
  getBrandedEnemies,
  selectRandomBrandedEnemy,
} from "./brand-utils";

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
  'apply_brand': (state, _e, sourceCard, _sp, _r, targets, _v) => 
    executeApplyBrandEffect(state, targets, sourceCard.id),
  'banish': (state, effect, sourceCard, sourcePlayerId, random, targets, _v) => {
    if (sourceCard.id === "inq_divine_punisher") {
      // 《神罰の執行者》の特殊ロジック: 烙印を持つ敵のみ対象
      const brandedTarget = selectRandomBrandedEnemy(state, sourcePlayerId, random);
      if (brandedTarget) {
        executeBanishEffect(state, [brandedTarget], sourceCard.id);
      }
    } else {
      executeBanishEffect(state, targets, sourceCard.id);
    }
  },
  'deck_search': (state, effect, sourceCard, sourcePlayerId, random, _t, _v) => 
    executeDeckSearchEffect(state, sourcePlayerId, sourceCard.id, effect.targetFilter, random),
};

/**
 * 特殊効果ハンドラー - カード固有の複雑なロジック
 */
export const specialEffectHandlers: Record<string, EffectHandler> = {
  'pyre_conditional_destroy': (state, effect, sourceCard, sourcePlayerId, random, targets, value) => {
    // 《火刑》の特殊ロジック: 烙印持ちなら破壊、そうでなければ3ダメージ
    if (targets.length === 0) return;
    
    const target = targets[0];
    const hasBrand = target.statusEffects.some(se => se.type === 'branded');
    
    if (hasBrand) {
      // 烙印を持つ場合は確実に破壊
      executeDamageEffect(state, [target], null, 99, sourceCard.id, sourceCard, random);
    } else {
      // 烙印を持たない場合は通常の3ダメージ
      executeDamageEffect(state, [target], null, 3, sourceCard.id, sourceCard, random);
    }
  },
  'judgment_angel_execution': (state, effect, sourceCard, sourcePlayerId, random, targets, value) => {
    // 《審判の天使》の特殊ロジック
    const opponentId = getOpponentId(sourcePlayerId);
    const opponent = state.players[opponentId];
    
    // 1. 烙印持ちの敵をすべて破壊
    const brandedEnemies = getBrandedEnemies(state, sourcePlayerId);
    if (brandedEnemies.length > 0) {
      executeDamageEffect(state, brandedEnemies, null, 99, sourceCard.id, sourceCard, random);
    }
    
    // 2. 烙印を持たない敵からランダムに1体を破壊
    const nonBrandedEnemies = opponent.field.filter(
      enemy => !enemy.statusEffects.some(se => se.type === 'branded') && enemy.currentHealth > 0
    );
    
    if (nonBrandedEnemies.length > 0) {
      const randomEnemy = random.choice(nonBrandedEnemies);
      if (randomEnemy) {
        executeDamageEffect(state, [randomEnemy], null, 99, sourceCard.id, sourceCard, random);
      }
    }
  },
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

  // --- 動的効果値の解決 ---
  if (
    sourceCard.id === "necro_soul_vortex" &&
    effect.action === "summon"
  ) {
    // 魂の渦: 墓地の枚数を効果値とする（自身は除く）
    value = sourcePlayer.graveyard.filter(c => c.id !== sourceCard.id).length;
  }
  if (
    sourceCard.id === "kni_galleon" &&
    effect.action === "buff_attack" &&
    effect.trigger === "passive"
  ) {
    // 不動の聖壁、ガレオン: 他の味方の数を効果値とする
    value = sourcePlayer.field.filter((c) => c.id !== sourceCard.id).length;
  }

  // --- 烙印関連カードの動的効果値解決 ---
  if (
    sourceCard.id === "inq_collective_confession" &&
    effect.action === "heal"
  ) {
    // 集団懺悔: 基本回復2 + 烙印を持つ敵の数
    const opponentId = getOpponentId(sourcePlayerId);
    const opponent = state.players[opponentId];
    const brandedCount = getBrandedCreatureCount(opponent.field);
    value = 2 + brandedCount;
  }

  return { value, targets };
}
