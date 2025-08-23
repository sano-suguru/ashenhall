import { describe, test, expect, beforeEach } from '@jest/globals';
import { createInitialGameState } from '@/lib/game-engine/core';
import { evaluateCardForPlay, chooseAttackTarget } from '@/lib/game-engine/ai-tactics';
import { getCardById, knightCards, necromancerCards, berserkerCards } from '@/data/cards/base-cards';
import type { GameState, Card, FieldCard } from '@/types/game';
import { SeededRandom } from '@/lib/game-engine/seeded-random';

describe('AI Tactics Engine', () => {
  let baseState: GameState;
  const p1 = 'player1';
  const p2 = 'player2';

  beforeEach(() => {
    baseState = createInitialGameState(
      'ai-test',
      [...knightCards, ...necromancerCards, ...berserkerCards],
      [...knightCards, ...necromancerCards, ...berserkerCards],
      'knight',
      'berserker',
      'balanced',
      'balanced',
      'ai-test-seed'
    );
  });

  describe('evaluateCardForPlay', () => {
    test('Knight (Formation) bonus should increase with more allies', () => {
      const vowOfUnity = getCardById('kni_vow_of_unity')!;
      const stateWithAllies = JSON.parse(JSON.stringify(baseState));
      stateWithAllies.players[p1].faction = 'knight';
      stateWithAllies.players[p1].field = [
        { id: 'kni_squire', owner: p1 },
        { id: 'kni_squire', owner: p1 },
        { id: 'kni_squire', owner: p1 },
      ] as FieldCard[];
      
      const scoreWithoutAllies = evaluateCardForPlay(vowOfUnity, baseState, p1);
      const scoreWithAllies = evaluateCardForPlay(vowOfUnity, stateWithAllies, p1);

      expect(scoreWithAllies).toBeGreaterThan(scoreWithoutAllies);
    });

    test('Necromancer (Echo) bonus should increase with more cards in graveyard', () => {
      const librarian = getCardById('necro_librarian')!;
      const stateWithGraveyard = JSON.parse(JSON.stringify(baseState));
      stateWithGraveyard.players[p1].faction = 'necromancer';
      stateWithGraveyard.players[p1].graveyard = [
        { id: 'necro_skeleton' }, { id: 'necro_skeleton' }, { id: 'necro_skeleton' }, { id: 'necro_skeleton' }, { id: 'necro_skeleton' },
      ] as Card[];

      const stateWithoutGraveyard = JSON.parse(JSON.stringify(baseState));
      stateWithoutGraveyard.players[p1].faction = 'necromancer';

      const scoreWithout = evaluateCardForPlay(librarian, stateWithoutGraveyard, p1);
      const scoreWith = evaluateCardForPlay(librarian, stateWithGraveyard, p1);

      expect(scoreWith).toBeGreaterThan(scoreWithout);
    });

    test('Berserker bonus should increase as player life decreases', () => {
        const lastStand = getCardById('ber_last_stand')!;
        const stateLowLife = JSON.parse(JSON.stringify(baseState));
        stateLowLife.players[p1].faction = 'berserker';
        stateLowLife.players[p1].life = 5;
  
        const stateHighLife = JSON.parse(JSON.stringify(baseState));
        stateHighLife.players[p1].faction = 'berserker';

        const scoreHighLife = evaluateCardForPlay(lastStand, stateHighLife, p1);
        const scoreLowLife = evaluateCardForPlay(lastStand, stateLowLife, p1);
  
        expect(scoreLowLife).toBeGreaterThan(scoreHighLife);
    });
  });

  describe('chooseAttackTarget', () => {
    const random = new SeededRandom('test-seed');

    test('should be forced to attack a Guard creature', () => {
      const attacker = { ...getCardById('ber_champion')!, owner: p1, currentHealth: 1 } as FieldCard;
      const guard = { ...getCardById('kni_vindicator')!, owner: p2, keywords: ['guard'], currentHealth: 1, isStealthed: false, isSilenced: false } as FieldCard;
      const highThreat = { ...getCardById('ber_champion')!, owner: p2, attack: 10, currentHealth: 1, isStealthed: false, isSilenced: false } as FieldCard;

      baseState.players[p2].field = [guard, highThreat];
      const result = chooseAttackTarget(attacker, baseState, random);

      expect(result.targetCard?.id).toBe('kni_vindicator');
      expect(result.targetPlayer).toBe(false);
    });

    test('should prioritize higher threat creature when no Guard is present', () => {
        const attacker = { ...getCardById('ber_champion')!, owner: p1, currentHealth: 1 } as FieldCard;
        const lowThreat = { ...getCardById('kni_squire')!, owner: p2, currentHealth: 1, attack: 1, isStealthed: false, isSilenced: false } as FieldCard;
        const highThreat = { ...getCardById('ber_champion')!, owner: p2, currentHealth: 3, attack: 4, isStealthed: false, isSilenced: false } as FieldCard;
  
        baseState.players[p2].field = [lowThreat, highThreat];
        
        const mockRandom = new SeededRandom('test-seed');
        mockRandom.next = () => 0.99; // Ensure it doesn't attack player
        const result = chooseAttackTarget(attacker, baseState, mockRandom);
  
        expect(result.targetCard?.id).toBe('ber_champion');
    });

    test('should attack the player if the opponent has an empty field', () => {
      const attacker = { ...getCardById('ber_champion')!, owner: p1, currentHealth: 1 } as FieldCard;
      baseState.players[p2].field = [];
      const result = chooseAttackTarget(attacker, baseState, random);

      expect(result.targetCard).toBeNull();
      expect(result.targetPlayer).toBe(true);
    });
  });
});
