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
      "test-seed"
    );
  });

  const findCard = (templateId: string) => ALL_CARDS.find((c) => c.templateId === templateId)!;

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
      { templateId: "c1", currentHealth: 1 } as FieldCard,
      { templateId: "c2", currentHealth: 1 } as FieldCard,
      { templateId: "c3", currentHealth: 1 } as FieldCard,
    ];

    const { value } = resolveDynamicEffectParameters(gameState, effect, sourceCard, sourcePlayerId, []);
    expect(value).toBe(3);
  });

  it("kni_white_wing_marshalが自身をバフの対象から除外すること - selectionRulesで処理", () => {
    const sourceCard = findCard("kni_white_wing_marshal");
    const effect = sourceCard.effects.find(e => e.target === 'ally_all')!;
    
    // 新しいシステムではselectionRulesで除外される
    expect(effect.selectionRules).toEqual([{ type: 'exclude_self', operator: 'eq', value: true }]);
    
    // resolveDynamicEffectParameters自体は対象を変更しない
    const initialTargets: FieldCard[] = [
      { templateId: sourceCard.templateId } as FieldCard,
      { templateId: "ally2" } as FieldCard,
    ];
    const { targets } = resolveDynamicEffectParameters(gameState, effect, sourceCard, sourcePlayerId, initialTargets);
    expect(targets.length).toBe(2); // resolveDynamicEffectParameters では変更されない
    
    // 実際の除外は TargetFilterEngine.applyRules で行われる
  });

  it("通常カードの効果パラメータは変更されないこと", () => {
    const sourceCard = findCard("kni_squire"); // 特殊ロジックを持たないカード
    const effect: CardEffect = {
      action: "damage",
      value: 2,
      target: "enemy_random",
      trigger: "on_play",
    };
    const initialTargets: FieldCard[] = [{ templateId: "enemy1" } as FieldCard];

    const { value, targets } = resolveDynamicEffectParameters(gameState, effect, sourceCard, sourcePlayerId, initialTargets);
    expect(value).toBe(2);
    expect(targets).toEqual(initialTargets);
  });
});
