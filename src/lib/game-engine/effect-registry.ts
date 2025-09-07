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
import type { DynamicValueDescriptor } from "@/types/cards";

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
    executeHandDiscardEffect(state, opponentId, value, sourceCard.id, random, effect.selectionRules);
  },
  'destroy_all_creatures': (state, _e, sourceCard, _sp, _r, _t, _v) => 
    executeDestroyAllCreaturesEffect(state, sourceCard.id),
  'apply_brand': (state, _e, sourceCard, _sp, _r, targets, _v) => 
    executeApplyBrandEffect(state, targets, sourceCard.id),
  'banish': (state, effect, sourceCard, sourcePlayerId, random, targets, _v) => 
    executeBanishEffect(state, targets, sourceCard.id),
  'deck_search': (state, effect, sourceCard, sourcePlayerId, random, _t, _v) => {
    executeDeckSearchEffect(state, sourcePlayerId, sourceCard.id, effect.selectionRules, random);
  },
};

/**
 * 特殊効果ハンドラー - カード固有の複雑なロジック
 */
export const specialEffectHandlers: Record<string, EffectHandler> = {
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
 * 動的値計算のタイプ
 */
type DynamicValueType = 
  | 'graveyard_creatures'  // 墓地のクリーチャー数
  | 'field_allies_count'   // 場の味方数
  | 'field_allies_alive'   // 生存している味方数
  | 'field_other_allies'   // 自分以外の味方数  
  | 'branded_enemy_count'  // 烙印を持つ敵の数
  | 'graveyard_excluding_self'; // 墓地数（自身を除く）

/**
 * カード固有の動的値計算設定
 */
interface DynamicValueConfig {
  type: DynamicValueType;
  baseValue?: number; // 基準値を加算
}

/**
 * カード固有の動的値計算設定マップ
 * ハードコーディングを段階的に汎用化するための移行システム
 */
const DYNAMIC_VALUE_CONFIGS: Record<string, Record<string, DynamicValueConfig>> = {
  'necro_grave_giant': {
    'buff_attack': { type: 'graveyard_creatures' }
  },
  'kni_sanctuary_prayer': {
    'heal': { type: 'field_allies_alive' }
  },
  'necro_soul_vortex': {
    'summon': { type: 'graveyard_excluding_self' }
  },
  'kni_galleon': {
    'buff_attack': { type: 'field_other_allies' }
  },
  'inq_collective_confession': {
    'heal': { type: 'branded_enemy_count', baseValue: 2 }
  }
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
        calculatedValue = sourcePlayer.graveyard.filter(c => c.type === 'creature').length;
      } else if (descriptor.filter === 'exclude_self') {
        calculatedValue = sourcePlayer.graveyard.filter(c => c.id !== sourceCard.id).length;
      } else {
        calculatedValue = sourcePlayer.graveyard.length;
      }
      break;
      
    case 'field':
      if (descriptor.filter === 'alive') {
        calculatedValue = sourcePlayer.field.filter(c => c.currentHealth > 0).length;
      } else if (descriptor.filter === 'exclude_self') {
        calculatedValue = sourcePlayer.field.filter(c => c.id !== sourceCard.id).length;
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
 * 旧システム動的値計算（段階的廃止予定）
 */
function calculateDynamicValue(
  config: DynamicValueConfig,
  state: GameState,
  sourceCard: Card,
  sourcePlayerId: PlayerId
): number {
  const sourcePlayer = state.players[sourcePlayerId];
  const opponentId = getOpponentId(sourcePlayerId);
  const opponent = state.players[opponentId];
  
  let calculatedValue = 0;
  
  switch (config.type) {
    case 'graveyard_creatures':
      calculatedValue = sourcePlayer.graveyard.filter(c => c.type === 'creature').length;
      break;
    case 'field_allies_alive':
      calculatedValue = sourcePlayer.field.filter(c => c.currentHealth > 0).length;
      break;
    case 'field_other_allies':
      calculatedValue = sourcePlayer.field.filter(c => c.id !== sourceCard.id).length;
      break;
    case 'branded_enemy_count':
      calculatedValue = getBrandedCreatureCount(opponent.field);
      break;
    case 'graveyard_excluding_self':
      calculatedValue = sourcePlayer.graveyard.filter(c => c.id !== sourceCard.id).length;
      break;
    default:
      calculatedValue = 0;
  }
  
  return calculatedValue + (config.baseValue || 0);
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

  // 新システム: 効果に dynamicValue がある場合はそちらを優先
  if (effect.dynamicValue) {
    value = calculateNewDynamicValue(effect.dynamicValue, state, sourceCard, sourcePlayerId);
  } else {
    // 旧システム: DYNAMIC_VALUE_CONFIGS を使用（段階的廃止予定）
    const cardConfig = DYNAMIC_VALUE_CONFIGS[sourceCard.id];
    if (cardConfig) {
      const effectConfig = cardConfig[effect.action];
      if (effectConfig) {
        value = calculateDynamicValue(effectConfig, state, sourceCard, sourcePlayerId);
      }
    }
  }

  return { value, targets };
}
