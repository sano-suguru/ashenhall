/**
 * 召喚効果 Executor
 * 
 * 設計方針:
 * - 召喚・蘇生効果の処理
 * - 特殊カード処理を含む（necro_soul_vortex, necro_soul_offering等）
 * - 決定論的なトークン生成
 */

import type {
  GameState,
  Card,
  FieldCard,
  PlayerId,
  ValueChange,
} from "@/types/game";
import { SeededRandom } from "../seeded-random";
import {
  addEffectTriggerAction,
} from "./effect-types";

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
  if (sourceCard.id === "necro_soul_vortex") {
    // 特殊効果: 魂の渦
    const sourcePlayer = state.players[sourcePlayerId];
    // 効果解決前に、自身を墓地から一時的に除外してカウントする
    const spellCardIndex = sourcePlayer.graveyard.findIndex(
      (c) => c.id === sourceCard.id
    );
    if (spellCardIndex > -1) {
      sourcePlayer.graveyard.splice(spellCardIndex, 1);
    }
    const graveyardSize = sourcePlayer.graveyard.length;
    sourcePlayer.graveyard = []; // 残りの墓地をゲームから除外
    applySummon(state, sourcePlayerId, sourceCard.id, random, {
      name: "魂の集合体",
      attack: graveyardSize,
      health: graveyardSize,
    });
  } else {
    // 通常の召喚
    applySummon(state, sourcePlayerId, sourceCard.id, random);
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
  
  if (sourceCard.id === "necro_soul_offering") {
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
        [toResurrect.id],
        sourceCard.id,
        random
      );
    }
  } else {
    // 通常の蘇生
    const resurrectTargets = sourcePlayer.graveyard.filter(
      (c) => c.type === "creature"
    );
    const chosen = random.choice(resurrectTargets);
    if (chosen) {
      applyResurrect(
        state,
        sourcePlayerId,
        [chosen.id],
        sourceCard.id,
        random
      );
    }
  }
}

/**
 * トークン召喚効果の処理（内部実装）
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

  // 基本的なトークン（スケルトン・ウォリアー風）を召喚
  const token: FieldCard = {
    id: `token-${state.turnNumber}-${random.next()}`, // 決定論的なID生成
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

  player.field.push(token);
  addEffectTriggerAction(state, sourceCardId, "summon", 1, { [token.id]: {} });
}

/**
 * 蘇生効果の処理（内部実装）
 */
function applyResurrect(
  state: GameState,
  sourcePlayerId: PlayerId,
  targetCardIds: string[],
  sourceCardId: string,
  random: SeededRandom
): void {
  const player = state.players[sourcePlayerId];

  for (const cardId of targetCardIds) {
    if (player.field.length >= 5) break;

    const graveyardIndex = player.graveyard.findIndex((c) => c.id === cardId);
    if (graveyardIndex === -1) continue;

    const [resurrectedCard] = player.graveyard.splice(graveyardIndex, 1);
    if (resurrectedCard.type !== "creature") continue;

    const newFieldCard: FieldCard = {
      ...resurrectedCard,
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
      [newFieldCard.id]: {},
    });
  }
}
