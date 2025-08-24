import { describe, it, expect } from "@jest/globals";
import { resolveDynamicEffectParameters } from "@/lib/game-engine/effect-registry";
import type { GameState, Card, CardEffect, FieldCard } from "@/types/game";
import { createInitialGameState } from "@/lib/game-engine/core";
import { ALL_CARDS } from "@/data/cards/base-cards";

describe("resolveDynamicEffectParameters", () => {
  let gameState: GameState;
  const sourcePlayerId = "player1";

  beforeEach(() => {
    gameState = createInitialGameState(
      "test-game",
      [],
      [],
      "knight",
      "mage",
      "balanced",
      "balanced",
      "test-seed"
    );
  });

  const findCard = (id: string) => ALL_CARDS.find((c) => c.id === id)!;

  it("necro_grave_giantの攻撃力バフが墓地のクリーチャー数と等しくなること", () => {
    const sourceCard = findCard("necro_grave_giant");
    const effect = sourceCard.effects.find(e => e.action === 'buff_attack')!;
    gameState.players[sourcePlayerId].graveyard = [
      { ...findCard("kni_squire"), type: "creature" },
      { ...findCard("kni_squire"), type: "creature" },
    ] as Card[];

    const { value } = resolveDynamicEffectParameters(gameState, effect, sourceCard, sourcePlayerId, []);
    expect(value).toBe(2);
  });

  it("kni_sanctuary_prayerの回復量が味方クリーチャー数と等しくなること", () => {
    const sourceCard = findCard("kni_sanctuary_prayer");
    const effect = sourceCard.effects.find(e => e.action === 'heal')!;
    gameState.players[sourcePlayerId].field = [
      { id: "c1", currentHealth: 1 } as FieldCard,
      { id: "c2", currentHealth: 1 } as FieldCard,
      { id: "c3", currentHealth: 1 } as FieldCard,
    ];

    const { value } = resolveDynamicEffectParameters(gameState, effect, sourceCard, sourcePlayerId, []);
    expect(value).toBe(3);
  });

  it("kni_white_wing_marshalが自身をバフの対象から除外すること", () => {
    const sourceCard = findCard("kni_white_wing_marshal");
    const effect = sourceCard.effects.find(e => e.target === 'ally_all')!;
    const initialTargets: FieldCard[] = [
      { id: sourceCard.id } as FieldCard,
      { id: "ally2" } as FieldCard,
    ];

    const { targets } = resolveDynamicEffectParameters(gameState, effect, sourceCard, sourcePlayerId, initialTargets);
    expect(targets.length).toBe(1);
    expect(targets[0].id).toBe("ally2");
  });

  it("通常カードの効果パラメータは変更されないこと", () => {
    const sourceCard = findCard("kni_squire"); // 特殊ロジックを持たないカード
    const effect: CardEffect = {
      action: "damage",
      value: 2,
      target: "enemy_random",
      trigger: "on_play",
    };
    const initialTargets: FieldCard[] = [{ id: "enemy1" } as FieldCard];

    const { value, targets } = resolveDynamicEffectParameters(gameState, effect, sourceCard, sourcePlayerId, initialTargets);
    expect(value).toBe(2);
    expect(targets).toEqual(initialTargets);
  });
});
