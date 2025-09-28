/**
 * 特殊効果 Executor - 統合版
 * 
 * 設計方針:
 * - 状態効果（沈黙・スタン・ドロー等）
 * - 召喚効果（トークン生成・蘇生）
 * - 決定論的な状態変更・召喚処理
 * 
 * 統合内容:
 * - status-effects.ts: executeSilenceEffect, executeReadyEffect, executeStunEffect, executeDrawCardEffect, executeApplyBrandEffect, executeDeckSearchEffect
 * - summon-effects.ts: executeSummonEffect, executeResurrectEffect
 */

import type {
  GameState,
  Card,
  FieldCard,
  PlayerId,
  ValueChange,
  EffectAction,
} from "@/types/game";
import type { FilterRule } from "@/types/cards";
import { SeededRandom } from "../seeded-random";
import {
  addEffectTriggerAction as addEffectTriggerActionFromLogger,
} from "../action-logger";
import { UniversalFilterEngine } from "../core/target-filter";
import { generateTokenInstanceId, generateFieldInstanceId } from "@/lib/instance-id-generator";

// =============================================================================
// SHARED UTILITIES
// =============================================================================

/**
 * 効果ログを追加のヘルパー関数
 * 全Effect Executorで共通使用
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

// =============================================================================
// STATUS EFFECTS (from status-effects.ts)
// =============================================================================

/**
 * 沈黙効果の処理
 */
export function executeSilenceEffect(
  state: GameState,
  targets: FieldCard[],
  sourceCardId: string
): void {
  const valueChanges: Record<string, ValueChange> = {};
  targets.forEach((target) => {
    target.isSilenced = true;
    valueChanges[target.templateId] = {};
  });
  addEffectTriggerAction(state, sourceCardId, "silence", 1, valueChanges);
}

/**
 * 再攻撃準備効果の処理
 */
export function executeReadyEffect(
  state: GameState,
  targets: FieldCard[],
  sourceCardId: string
): void {
  const valueChanges: Record<string, ValueChange> = {};
  targets.forEach((target) => {
    if (!target.readiedThisTurn) {
      target.hasAttacked = false;
      target.readiedThisTurn = true;
      valueChanges[target.templateId] = {}; // Just log that the effect happened
    }
  });

  if (Object.keys(valueChanges).length > 0) {
    addEffectTriggerAction(state, sourceCardId, "ready", 1, valueChanges);
  }
}

// =============================================================================
// SUMMON HELPERS (複雑度削減)
// =============================================================================

/**
 * トークン初期化ヘルパー（複雑度削減）
 */
function createTokenFieldCard(
  state: GameState,
  sourcePlayerId: PlayerId,
  tokenTemplateId: string,
  tokenStats?: { name?: string; attack: number; health: number }
): FieldCard {
  const player = state.players[sourcePlayerId];
  
  return {
    templateId: tokenTemplateId,
    instanceId: generateTokenInstanceId(state, sourcePlayerId, tokenStats?.name),
    owner: sourcePlayerId,
    name: tokenStats?.name || "トークン",
    type: "creature",
    faction: player.faction,
    cost: 0,
    attack: tokenStats?.attack ?? 1,
    health: tokenStats?.health ?? 1,
    keywords: [],
    currentHealth: tokenStats?.health ?? 1,
    attackModifier: 0,
    healthModifier: 0,
    passiveAttackModifier: 0,
    passiveHealthModifier: 0,
    effects: [],
    summonTurn: state.turnNumber,
    position: player.field.length,
    hasAttacked: false,
    isStealthed: false,
    isSilenced: false,
    statusEffects: [],
    readiedThisTurn: false,
  };
}

/**
 * トークン召喚効果の処理（内部実装・複雑度削減版）
 */
function applySummon(
  state: GameState,
  sourcePlayerId: PlayerId,
  sourceCardId: string,
  random: SeededRandom,
  tokenStats?: { name?: string; attack: number; health: number }
): void {
  const player = state.players[sourcePlayerId];

  // 場が満杯の場合は召喚できない
  if (player.field.length >= 5) {
    return;
  }

  // トークン生成と配置
  const tokenTemplateId = `token-${state.turnNumber}-${random.next()}`;
  const token = createTokenFieldCard(state, sourcePlayerId, tokenTemplateId, tokenStats);

  player.field.push(token);
  addEffectTriggerAction(state, sourceCardId, "summon", 1, { [token.templateId]: {} });
}

/**
 * 蘇生効果の処理（内部実装）
 */
function applyResurrect(
  state: GameState,
  sourcePlayerId: PlayerId,
  targetCardIds: string[],
  sourceCardId: string
): void {
  const player = state.players[sourcePlayerId];

  for (const cardId of targetCardIds) {
    if (player.field.length >= 5) break;

    const graveyardIndex = player.graveyard.findIndex((c) => c.templateId === cardId);
    if (graveyardIndex === -1) continue;

    const [resurrectedCard] = player.graveyard.splice(graveyardIndex, 1);
    if (resurrectedCard.type !== "creature") continue;

    const newFieldCard: FieldCard = {
      ...resurrectedCard,
      instanceId: generateFieldInstanceId(resurrectedCard.templateId, state, sourcePlayerId),
      owner: sourcePlayerId,
      currentHealth: resurrectedCard.health,
      attackModifier: 0,
      healthModifier: 0,
      passiveAttackModifier: 0,
      passiveHealthModifier: 0,
      summonTurn: state.turnNumber,
      position: player.field.length,
      hasAttacked: true,
      isStealthed: false,
      isSilenced: false,
      statusEffects: [],
      readiedThisTurn: false,
    };

    player.field.push(newFieldCard);
    addEffectTriggerAction(state, sourceCardId, "resurrect", 1, {
      [newFieldCard.templateId]: {},
    });
  }
}

/**
 * スタン効果の処理
 */
export function executeStunEffect(
  state: GameState,
  targets: FieldCard[],
  duration: number,
  sourceCardId: string
): void {
  targets.forEach((target) => {
    const existingStun = target.statusEffects.find((e) => e.type === "stun");
    if (existingStun) {
      existingStun.duration = Math.max(existingStun.duration, duration);
    } else {
      target.statusEffects.push({ type: "stun", duration });
    }
  });
  const valueChanges: Record<string, ValueChange> = {};
  targets.forEach((target) => {
    valueChanges[target.templateId] = {};
  });
  addEffectTriggerAction(state, sourceCardId, "stun", duration, valueChanges);
}

/**
 * カードドロー効果の処理
 */
export function executeDrawCardEffect(
  state: GameState,
  targetPlayerId: PlayerId,
  drawCount: number,
  sourceCardId: string
): void {
  const player = state.players[targetPlayerId];

  for (let i = 0; i < drawCount; i++) {
    // 手札上限チェック
    if (player.hand.length >= 7) {
      break;
    }

    // デッキからドロー
    if (player.deck.length > 0) {
      const drawnCard = player.deck.pop()!;
      player.hand.push(drawnCard);
    } else {
      // デッキ切れダメージ
      player.life = Math.max(0, player.life - 1);
    }
  }

  addEffectTriggerAction(state, sourceCardId, "draw_card", drawCount, {
    [targetPlayerId]: {},
  });
}

/**
 * 烙印付与効果の処理
 */
export function executeApplyBrandEffect(
  state: GameState,
  targets: FieldCard[],
  sourceCardId: string
): void {
  const valueChanges: Record<string, ValueChange> = {};
  
  targets.forEach((target) => {
    // 既に烙印を持っている場合は何もしない
    const hasExistingBrand = target.statusEffects.some(e => e.type === 'branded');
    if (!hasExistingBrand) {
      target.statusEffects.push({ type: 'branded' });
      valueChanges[target.templateId] = {}; // ログ用
    }
  });

  if (Object.keys(valueChanges).length > 0) {
    addEffectTriggerAction(state, sourceCardId, "apply_brand", 1, valueChanges);
  }
}

/**
 * デッキサーチ効果の処理（汎用）
 */
export function executeDeckSearchEffect(
  state: GameState,
  targetPlayerId: PlayerId,
  sourceCardId: string,
  filter?: FilterRule[],
  random?: { choice: <T>(array: T[]) => T | undefined }
): void {
  const player = state.players[targetPlayerId];
  
  // 手札上限チェック
  if (player.hand.length >= 7) {
    return;
  }
  
  // UniversalFilterEngineを使用してデッキフィルタリング（複雑度削減）
  let searchTargets = player.deck;
  
  if (filter && Array.isArray(filter)) {
    searchTargets = UniversalFilterEngine.applyRules(player.deck, filter, sourceCardId);
  }
  
  if (searchTargets.length === 0) {
    return;
  }
  
  // ランダム選択
  const chosenCard = random ? 
    random.choice(searchTargets) : 
    searchTargets[Math.floor(Math.random() * searchTargets.length)];
    
  if (chosenCard) {
    // デッキから除去
    player.deck = player.deck.filter(c => c.templateId !== chosenCard.templateId);
    // 手札に追加
    player.hand.push(chosenCard);
    
    addEffectTriggerAction(state, sourceCardId, "deck_search", 1, {
      [targetPlayerId]: {},
    });
  }
}

// =============================================================================
// SUMMON EFFECTS (from summon-effects.ts)
// =============================================================================

/**
 * 召喚効果の処理
 */
export function executeSummonEffect(
  state: GameState,
  sourcePlayerId: PlayerId,
  sourceCard: Card,
  random: SeededRandom,
  value: number
): void {
  if (sourceCard.templateId === "necro_soul_vortex") {
    // 特殊効果: 魂の渦 - valueはeffect-registryで計算された墓地の枚数
    const sourcePlayer = state.players[sourcePlayerId];
    sourcePlayer.graveyard = []; // 墓地を空にする
    applySummon(state, sourcePlayerId, sourceCard.templateId, random, {
      name: "魂の集合体",
      attack: value,
      health: value,
    });
  } else {
    // 通常の召喚 (necro_necromancerなど、valueは召喚回数)
    for (let i = 0; i < value; i++) {
      applySummon(state, sourcePlayerId, sourceCard.templateId, random);
    }
  }
}

/**
 * 蘇生効果の処理
 */
export function executeResurrectEffect(
  state: GameState,
  sourcePlayerId: PlayerId,
  sourceCard: Card,
  random: SeededRandom,
  value: number
): void {
  const sourcePlayer = state.players[sourcePlayerId];
  
  if (sourceCard.templateId === "necro_soul_offering") {
    // 特殊効果: 魂の供物
    const allies = sourcePlayer.field.filter((c) => c.currentHealth > 0);
    if (allies.length > 0) {
      const sacrifice = random.choice(allies)!;
      sacrifice.currentHealth = 0; // 死亡させる
    }
    const resurrectTargets = sourcePlayer.graveyard.filter(
      (c) => c.type === "creature" && c.cost <= value
    );
    if (resurrectTargets.length > 0) {
      const toResurrect = random.choice(resurrectTargets)!;
      applyResurrect(
        state,
        sourcePlayerId,
        [toResurrect.templateId],
        sourceCard.templateId
      );
    }
  } else {
    // 通常の蘇生 - valueの数だけ蘇生処理
    const resurrectTargets = sourcePlayer.graveyard.filter(
      (c) => c.type === "creature"
    );
    
    const chosenIds: string[] = [];
    for (let i = 0; i < value && i < resurrectTargets.length; i++) {
      // 既に選択済みのカードを除外してランダム選択
      const availableTargets = resurrectTargets.filter(
        target => !chosenIds.includes(target.templateId)
      );
      if (availableTargets.length === 0) break;
      
      const chosen = random.choice(availableTargets);
      if (chosen) {
        chosenIds.push(chosen.templateId);
      }
    }
    
    if (chosenIds.length > 0) {
      applyResurrect(
        state,
        sourcePlayerId,
        chosenIds,
        sourceCard.templateId
      );
    }
  }
}
