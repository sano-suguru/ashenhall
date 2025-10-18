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
// 効果実行関数のインポート - 統合版
import {
  getOpponentId,
  executeDamageEffect,
  executeHealEffect,
  executeBuffAttackEffect,
  executeBuffHealthEffect,
  executeDebuffAttackEffect,
  executeDebuffHealthEffect,
  executeDestroyDeckTopEffect,
  executeSwapAttackHealthEffect,
  executeHandDiscardEffect,
  executeDestroyAllCreaturesEffect,
  executeBanishEffect,
} from "./effects/core-effects";
import {
  executeSummonEffect,
  executeResurrectEffect,
  executeSilenceEffect,
  executeReadyEffect,
  executeStunEffect,
  executeDrawCardEffect,
  executeApplyBrandEffect,
  executeDeckSearchEffect,
  executeChainEffect,
} from "./effects/specialized-effects";
import {
  getBrandedCreatureCount,
} from "./brand-utils";
import { GraveyardLookup, fieldLookup } from "./field-search-cache";
import type { DynamicValueDescriptor } from "@/types/cards";

/**
 * 全ての効果ハンドラが従うべき関数シグネチャ。
 * シグネチャ統一のため一部効果で未使用の引数（value など）も保持する。
 *
 * @param state 現在のゲーム状態（直接ミューテート可 / 決定論的ロジック厳守）
 * @param effect 効果定義（ターゲット指定や dynamicValue 情報を含む）
 * @param sourceCard 効果を発動したカード（墓地移動後でも参照用に保持）
 * @param sourcePlayerId 発動プレイヤー ID
 * @param random 乱数（SeededRandom）決定論的挙動のため必ずこれを使用
 * @param targets フィールド上の対象カード配列（プレイヤー対象時は空配列）
 * @param value 確定済み効果値（固定値 or dynamicValue 計算結果）。未使用効果もシグネチャ統一のため受け取る。
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

/**
 * 連鎖対応ダメージ処理（内部関数）
 * 初期ダメージ実行後、キル判定を行い連鎖効果を発動
 */
function executeDamageWithChain(
  state: GameState,
  effect: CardEffect,
  sourceCard: Card,
  sourcePlayerId: PlayerId,
  random: SeededRandom,
  targets: FieldCard[],
  value: number
): void {
  // HP記録（キル判定用）
  const targetsHealthBefore = targets.map(t => ({
    card: t,
    health: t.currentHealth,
    instanceId: t.instanceId,
  }));
  
  // 初期ダメージ実行
  const opponentId = getOpponentId(sourcePlayerId);
  if (effect.target === "player") {
    executeDamageEffect(state, [], opponentId, value, sourceCard.templateId);
  } else if (effect.target === "self_player") {
    executeDamageEffect(state, [], sourcePlayerId, value, sourceCard.templateId);
  } else {
    executeDamageEffect(state, targets, null, value, sourceCard.templateId);
  }
  
  // キル判定
  const killedTargets = targetsHealthBefore
    .filter(({ card, health }) => health > 0 && card.currentHealth <= 0)
    .map(({ card }) => card);
  
  // 連鎖効果発動
  if (killedTargets.length > 0 && effect.chainOnKill) {
    executeChainEffect(
      state,
      effect.chainOnKill,
      sourceCard,
      sourcePlayerId,
      random,
      killedTargets,
      1,  // 初回連鎖は深度1
      effectHandlers
    );
  }
}

// prettier-ignore
export const effectHandlers: Partial<Record<EffectAction, EffectHandler>> = {
  'damage': (state, effect, sourceCard, sourcePlayerId, random, targets, value) => {
    // 汎用連鎖システム対応
    if (effect.chainOnKill) {
      executeDamageWithChain(state, effect, sourceCard, sourcePlayerId, random, targets, value);
      return;
    }
    
    // 通常のダメージ処理
    const opponentId = getOpponentId(sourcePlayerId);
    if (effect.target === "player") {
      executeDamageEffect(state, [], opponentId, value, sourceCard.templateId);
    } else if (effect.target === "self_player") {
      executeDamageEffect(state, [], sourcePlayerId, value, sourceCard.templateId);
    } else {
      executeDamageEffect(state, targets, null, value, sourceCard.templateId);
    }
  },
  'heal': (state, effect, sourceCard, sourcePlayerId, _random, targets, value) => {
    if (effect.target === "player") {
      executeHealEffect(state, [], sourcePlayerId, value, sourceCard.templateId);
    } else {
      executeHealEffect(state, targets, null, value, sourceCard.templateId);
    }
  },
  'buff_attack': (state, effect, sourceCard, _sp, _r, targets, value) => 
    executeBuffAttackEffect(state, targets, value, sourceCard.templateId, effect),
  'buff_health': (state, effect, sourceCard, _sp, _r, targets, value) => 
    executeBuffHealthEffect(state, targets, value, sourceCard.templateId, effect),
  'debuff_attack': (state, _e, sourceCard, _sp, _r, targets, value) => 
    executeDebuffAttackEffect(state, targets, value, sourceCard.templateId),
  'debuff_health': (state, _e, sourceCard, _sp, _r, targets, value) => 
    executeDebuffHealthEffect(state, targets, value, sourceCard.templateId),
  'summon': (state, _e, sourceCard, sourcePlayerId, random, _t, value) => 
    executeSummonEffect(state, sourcePlayerId, sourceCard, random, value),
  'draw_card': (state, _e, sourceCard, sourcePlayerId, _r, _t, value) => 
    executeDrawCardEffect(state, sourcePlayerId, value, sourceCard.templateId),
  'silence': (state, _e, sourceCard, _sp, _r, targets, _v) => {
    void _v;
    return executeSilenceEffect(state, targets, sourceCard.templateId);
  },
  'resurrect': (state, _e, sourceCard, sourcePlayerId, random, _t, value) => 
    executeResurrectEffect(state, sourcePlayerId, sourceCard, random, value),
  'stun': (state, _e, sourceCard, _sp, _r, targets, value) => 
    executeStunEffect(state, targets, value, sourceCard.templateId),
  'ready': (state, _e, sourceCard, _sp, _r, targets, _v) => {
    void _v; // JSDoc上保持する value パラメータとの整合性確保
    return executeReadyEffect(state, targets, sourceCard.templateId);
  },
  'destroy_deck_top': (state, _e, sourceCard, sourcePlayerId, _r, _t, value) => 
    executeDestroyDeckTopEffect(state, sourcePlayerId, value, sourceCard.templateId),
  'swap_attack_health': (state, _e, sourceCard, _sp, _r, targets, _v) => {
    void _v;
    return executeSwapAttackHealthEffect(state, targets, sourceCard.templateId);
  },
  'hand_discard': (state, effect, sourceCard, sourcePlayerId, random, _t, value) => {
    const opponentId = getOpponentId(sourcePlayerId);
    executeHandDiscardEffect(state, opponentId, value, sourceCard.templateId, random, effect.selectionRules);
  },
  'destroy_all_creatures': (state, _e, sourceCard, _sp, _r, _t, _v) => {
    void _sp; void _r; void _t; void _v;
    return executeDestroyAllCreaturesEffect(state, sourceCard.templateId);
  },
  'apply_brand': (state, _e, sourceCard, _sp, _r, targets, _v) => {
    void _v;
    return executeApplyBrandEffect(state, targets, sourceCard.templateId);
  },
  'banish': (state, effect, sourceCard, sourcePlayerId, random, targets, _v) => {
    void _v;
    return executeBanishEffect(state, targets, sourceCard.templateId);
  },
  'deck_search': (state, effect, sourceCard, sourcePlayerId, random, _t, _v) => {
    void _t; void _v;
    executeDeckSearchEffect(state, sourcePlayerId, sourceCard.templateId, effect.selectionRules, random);
  },
};

/**
 * 新しい動的値計算システム（推奨方式）
 */
function calculateNewDynamicValue(
  descriptor: DynamicValueDescriptor,
  state: GameState,
  sourceCard: Card,
  sourcePlayerId: PlayerId
): number {
  const sourcePlayer = state.players[sourcePlayerId];
  const opponentId = getOpponentId(sourcePlayerId);
  const opponent = state.players[opponentId];
  
  let calculatedValue = 0;
  
  switch (descriptor.source) {
    case 'graveyard':
      if (descriptor.filter === 'creatures') {
        calculatedValue = GraveyardLookup.countCreatures(state, sourcePlayerId);
      } else if (descriptor.filter === 'exclude_self') {
        calculatedValue = GraveyardLookup.countExcludingSelf(state, sourcePlayerId, sourceCard.templateId);
      } else {
        calculatedValue = sourcePlayer.graveyard.length;
      }
      break;
      
    case 'field':
      if (descriptor.filter === 'alive') {
        calculatedValue = fieldLookup.findAliveCreatures(state, sourcePlayerId).length;
      } else if (descriptor.filter === 'exclude_self') {
        calculatedValue = sourcePlayer.field.filter(c => c.templateId !== sourceCard.templateId).length;
      } else {
        calculatedValue = sourcePlayer.field.length;
      }
      break;
      
    case 'enemy_field':
      if (descriptor.filter === 'has_brand') {
        calculatedValue = getBrandedCreatureCount(opponent.field);
      } else {
        calculatedValue = opponent.field.length;
      }
      break;
      
    default:
      calculatedValue = 0;
  }
  
  return calculatedValue + (descriptor.baseValue || 0);
}


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
  const targets = initialTargets;

  // 動的値計算システム: 効果に dynamicValue がある場合は計算
  if (effect.dynamicValue) {
    value = calculateNewDynamicValue(effect.dynamicValue, state, sourceCard, sourcePlayerId);
  }

  return { value, targets };
}
