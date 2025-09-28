/**
 * AI戦術ロジックの対象存在チェックテスト
 */

import { 
  canEffectFindValidTargets, 
  evaluateCardForPlay 
} from '../lib/game-engine/ai-tactics';
import { getCardById, necromancerCards } from '../data/cards/base-cards';
import { createInitialGameState } from '../lib/game-engine/core';
import type { GameState, CreatureCard, Card } from '../types/game';

describe('AI戦術ロジック - 対象存在チェック', () => {
  let gameState: GameState;

  // テスト用デッキ作成
  const createTestDeck = (): Card[] => {
    const deck: Card[] = [];
    const availableCards = necromancerCards.slice(0, 4);
    availableCards.forEach(card => {
      for (let i = 0; i < 5; i++) {
        deck.push({ ...card, templateId: `${card.templateId}_${i}` });
      }
    });
    return deck;
  };

  beforeEach(() => {
    const deck1 = createTestDeck();
    const deck2 = createTestDeck();
    gameState = createInitialGameState(
      'test-game',
      deck1,
      deck2,
      'necromancer',
      'necromancer', 
      'balanced',
      'balanced',
      'test-seed'
    );
  });

  describe('canEffectFindValidTargets', () => {
    it('罪の重圧が相手場にクリーチャーがいない場合にfalseを返すこと', () => {
      const sinBurden = getCardById('inq_sin_burden');
      expect(sinBurden).toBeDefined();
      
      // 相手場を空にする
      gameState.players.player2.field = [];
      
      const canFind = canEffectFindValidTargets(sinBurden!, gameState, 'player1');
      expect(canFind).toBe(false);
    });

    it('罪の重圧が相手場にクリーチャーがいる場合にtrueを返すこと', () => {
      const sinBurden = getCardById('inq_sin_burden');
      expect(sinBurden).toBeDefined();
      
      // 相手場にクリーチャーを配置
      const skeleton = getCardById('necro_skeleton')! as CreatureCard;
      gameState.players.player2.field = [{
        ...skeleton,
        owner: 'player2',
        currentHealth: skeleton.health,
        attackModifier: 0,
        healthModifier: 0,
        passiveAttackModifier: 0,
        passiveHealthModifier: 0,
        summonTurn: 1,
        position: 0,
        hasAttacked: false,
        isStealthed: false,
        isSilenced: false,
        statusEffects: [],
        readiedThisTurn: false,
      }];
      
      const canFind = canEffectFindValidTargets(sinBurden!, gameState, 'player1');
      expect(canFind).toBe(true);
    });

    it('沈黙の令状が相手場が空の場合にfalseを返すこと', () => {
      const writOfSilence = getCardById('inq_writ_of_silence');
      expect(writOfSilence).toBeDefined();
      
      gameState.players.player2.field = [];
      
      const canFind = canEffectFindValidTargets(writOfSilence!, gameState, 'player1');
      expect(canFind).toBe(false);
    });

    it('クリーチャーカードは常にtrueを返すこと', () => {
      const skeleton = getCardById('necro_skeleton');
      expect(skeleton).toBeDefined();
      
      gameState.players.player2.field = [];
      
      const canFind = canEffectFindValidTargets(skeleton!, gameState, 'player1');
      expect(canFind).toBe(true);
    });

    it('効果を持たないスペルは常にtrueを返すこと', () => {
      // 効果なしのテスト用スペル（該当するカードがない場合は、テスト用に作成）
      const testSpell = {
        templateId: 'test_spell',
        name: 'テスト呪文',
        type: 'spell' as const,
        faction: 'mage' as const,
        cost: 1,
        keywords: [],
        effects: [],
      };
      
      const canFind = canEffectFindValidTargets(testSpell, gameState, 'player1');
      expect(canFind).toBe(true);
    });

    it('対象不可のクリーチャーは有効な対象として扱わないこと', () => {
      const sinBurden = getCardById('inq_sin_burden');
      expect(sinBurden).toBeDefined();
      
      // 対象不可のクリーチャーを配置
      const stoneGuardian = getCardById('inq_stone_guardian')! as CreatureCard;
      gameState.players.player2.field = [{
        ...stoneGuardian,
        owner: 'player2',
        currentHealth: stoneGuardian.health,
        attackModifier: 0,
        healthModifier: 0,
        passiveAttackModifier: 0,
        passiveHealthModifier: 0,
        summonTurn: 1,
        position: 0,
        hasAttacked: false,
        isStealthed: false,
        isSilenced: false,
        statusEffects: [],
        readiedThisTurn: false,
      }];
      
      const canFind = canEffectFindValidTargets(sinBurden!, gameState, 'player1');
      expect(canFind).toBe(false);
    });
  });

  describe('evaluateCardForPlay - 無駄撃ち防止', () => {
    it('相手場が空の場合、罪の重圧の評価スコアが大幅に下がること', () => {
      const sinBurden = getCardById('inq_sin_burden');
      expect(sinBurden).toBeDefined();
      
      gameState.players.player1.faction = 'inquisitor';
      gameState.players.player1.tacticsType = 'balanced';
      gameState.players.player2.field = [];
      
      const score = evaluateCardForPlay(sinBurden!, gameState, 'player1');
      expect(score).toBeLessThan(-500); // 大幅なペナルティが適用されている
    });

    it('相手場にクリーチャーがいる場合、罪の重圧の評価スコアが正常であること', () => {
      const sinBurden = getCardById('inq_sin_burden');
      expect(sinBurden).toBeDefined();
      
      gameState.players.player1.faction = 'inquisitor';
      gameState.players.player1.tacticsType = 'balanced';
      
      // 相手場にクリーチャーを配置
      const skeleton = getCardById('necro_skeleton')! as CreatureCard;
      gameState.players.player2.field = [{
        ...skeleton,
        owner: 'player2',
        currentHealth: skeleton.health,
        attackModifier: 0,
        healthModifier: 0,
        passiveAttackModifier: 0,
        passiveHealthModifier: 0,
        summonTurn: 1,
        position: 0,
        hasAttacked: false,
        isStealthed: false,
        isSilenced: false,
        statusEffects: [],
        readiedThisTurn: false,
      }];
      
      const score = evaluateCardForPlay(sinBurden!, gameState, 'player1');
      expect(score).toBeGreaterThan(0); // ペナルティが適用されていない
    });

    it('クリーチャーカードは相手場の状況に関係なく正常に評価されること', () => {
      const skeleton = getCardById('necro_skeleton');
      expect(skeleton).toBeDefined();
      
      gameState.players.player1.faction = 'necromancer';
      gameState.players.player1.tacticsType = 'balanced';
      gameState.players.player2.field = [];
      
      const score = evaluateCardForPlay(skeleton!, gameState, 'player1');
      expect(score).toBeGreaterThan(0);
    });
  });
});
