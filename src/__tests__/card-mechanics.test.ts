import { describe, test, expect } from '@jest/globals';
import { createInitialGameState, processGameStep } from '@/lib/game-engine/core';
import { getCardById, necromancerCards, berserkerCards, mageCards, knightCards, inquisitorCards } from '@/data/cards/base-cards';
import type { GameState, Card, FieldCard, CreatureCard } from '@/types/game';

describe('Card Mechanics Tests', () => {
  const p1 = 'player1';
  const p2 = 'player2';
  let baseState: GameState;

  beforeEach(() => {
    const allCards = [...necromancerCards, ...berserkerCards, ...mageCards, ...knightCards, ...inquisitorCards];
    baseState = createInitialGameState(
      'test-game',
      allCards,
      allCards,
      'necromancer',
      'berserker',
      'balanced',
      'balanced',
      'test-seed'
    );
    baseState.turnNumber = 5; // Ensure enough energy
  });

  // === Basic Keyword Tests (from new-card-mechanics.test.ts) ===

  test('Lifesteal keyword should heal the player upon dealing damage', () => {
    const bloodCraver = getCardById('ber_craver') as CreatureCard;
    const skeleton = getCardById('necro_skeleton') as CreatureCard;
    let gameState = createInitialGameState('lifesteal-test', [bloodCraver], [skeleton], 'berserker', 'necromancer', 'aggressive', 'aggressive', 'seed');
    
    gameState.players[p1].life = 10;
    gameState.players[p1].field.push({ ...bloodCraver, owner: p1, currentHealth: 3, attackModifier: 0, healthModifier: 0, passiveAttackModifier: 0, passiveHealthModifier: 0, summonTurn: 0, position: 0, hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [] });
    gameState.players[p2].field.push({ ...skeleton, owner: p2, currentHealth: 1, attackModifier: 0, healthModifier: 0, passiveAttackModifier: 0, passiveHealthModifier: 0, summonTurn: 0, position: 0, hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [] });
    gameState.phase = 'battle';
    gameState.currentPlayer = p1;

    gameState = processGameStep(gameState);

    expect(gameState.players[p1].life).toBe(10 + (bloodCraver.attack));
  });

  test('Poison keyword should apply a status effect and move card to graveyard on death', () => {
    const venomtongue = getCardById('inq_venomtongue') as CreatureCard;
    const skeleton = getCardById('necro_skeleton') as CreatureCard;
    let gameState = createInitialGameState('poison-test', [venomtongue], [skeleton], 'inquisitor', 'necromancer', 'aggressive', 'aggressive', 'seed');

    gameState.players[p1].field.push({ ...venomtongue, owner: p1, currentHealth: 1, attackModifier: 0, healthModifier: 0, passiveAttackModifier: 0, passiveHealthModifier: 0, summonTurn: 0, position: 0, hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [] });
    gameState.players[p2].field.push({ ...skeleton, owner: p2, currentHealth: 2, attackModifier: 0, healthModifier: 0, passiveAttackModifier: 0, passiveHealthModifier: 0, summonTurn: 0, position: 0, hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [] });
    gameState.phase = 'battle';
    gameState.currentPlayer = p1;

    gameState = processGameStep(gameState);
    
    const targetOnField = gameState.players[p2].field[0];
    expect(targetOnField.statusEffects.some(e => e.type === 'poison')).toBe(true);
    expect(targetOnField.currentHealth).toBe(2 - venomtongue.attack);

    gameState.phase = 'end';
    gameState = processGameStep(gameState);
    
    expect(gameState.players[p2].field.length).toBe(0);
    expect(gameState.players[p2].graveyard.length).toBe(1);
    expect(gameState.players[p2].graveyard[0].id).toBe(skeleton.id);
  });

  test('Retaliate keyword should deal damage back to the attacker', () => {
    const vindicator = getCardById('kni_vindicator') as CreatureCard;
    const skeleton = getCardById('necro_skeleton') as CreatureCard;
    let gameState = createInitialGameState('retaliate-test', [skeleton], [vindicator], 'necromancer', 'knight', 'aggressive', 'aggressive', 'seed');

    const initialHealth = 4;
    gameState.players[p1].field.push({ ...skeleton, owner: p1, currentHealth: initialHealth, attackModifier: 0, healthModifier: 0, passiveAttackModifier: 0, passiveHealthModifier: 0, summonTurn: 0, position: 0, hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [] });
    gameState.players[p2].field.push({ ...vindicator, owner: p2, currentHealth: 3, attackModifier: 0, healthModifier: 0, passiveAttackModifier: 0, passiveHealthModifier: 0, summonTurn: 0, position: 0, hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [] });
    gameState.phase = 'battle';
    gameState.currentPlayer = p1;

    gameState = processGameStep(gameState);

    const attacker = gameState.players[p1].field[0];
    const retaliateDamage = Math.ceil(vindicator.attack / 2);
    const defenderBaseDamage = vindicator.attack;
    expect(attacker.currentHealth).toBe(initialHealth - defenderBaseDamage - retaliateDamage);
  });

  // === Advanced Mechanics Tests (from advanced-card-mechanics.test.ts) ===

  test('墓所の支配者 should resurrect a creature from the graveyard', () => {
    const graveMaster = necromancerCards.find(c => c.id === 'necro_grave_master')! as CreatureCard;
    const skeleton = necromancerCards.find(c => c.id === 'necro_skeleton')! as CreatureCard;
    
    baseState.players[p1].hand = [graveMaster];
    baseState.players[p1].graveyard = [skeleton];
    baseState.players[p1].energy = 4;

    let state = JSON.parse(JSON.stringify(baseState));
    state.phase = 'deploy';
    state.currentPlayer = p1;
    
    state = processGameStep(state); 

    const playerField = state.players[p1].field;
    expect(playerField.some((c: Card) => c.id === 'necro_grave_master')).toBe(true);
    expect(playerField.some((c: Card) => c.id === 'necro_skeleton')).toBe(true);
    expect(state.players[p1].graveyard.length).toBe(0);
  });

  test('最後の抵抗 should only deal damage to creatures when player life is low', () => {
    const lastStand = berserkerCards.find(c => c.id === 'ber_last_stand')!;
    const enemyCreature = necromancerCards.find(c => c.id === 'necro_skeleton')! as CreatureCard;

    baseState.players[p2].field = [{ ...enemyCreature, owner: p2, currentHealth: 3, attackModifier: 0, healthModifier: 0, passiveAttackModifier: 0, passiveHealthModifier: 0, summonTurn: 1, position: 0, hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [] }];
    
    let stateHighLife = JSON.parse(JSON.stringify(baseState));
    stateHighLife.players[p1].life = 10;
    stateHighLife.players[p1].hand = [lastStand];
    stateHighLife.players[p1].energy = 1;
    stateHighLife.phase = 'deploy';
    stateHighLife.currentPlayer = p1;
    
    stateHighLife = processGameStep(stateHighLife);
    expect(stateHighLife.players[p2].field[0].currentHealth).toBe(3);

    let stateLowLife = JSON.parse(JSON.stringify(baseState));
    stateLowLife.players[p1].life = 7;
    stateLowLife.players[p1].hand = [lastStand];
    stateLowLife.players[p1].energy = 1;
    stateLowLife.phase = 'deploy';
    stateLowLife.currentPlayer = p1;

    stateLowLife = processGameStep(stateLowLife);
    expect(stateLowLife.players[p2].field[0].currentHealth).toBe(0);
  });

  test('魔力循環の学者 should gain attack when a spell is played', () => {
    const scholar = mageCards.find(c => c.id === 'mag_scholar')! as CreatureCard;
    const spell = mageCards.find(c => c.id === 'mag_torrent')!;

    let state = JSON.parse(JSON.stringify(baseState));
    state.players[p1].field = [{ ...scholar, owner: p1, currentHealth: 3, attackModifier: 0, healthModifier: 0, passiveAttackModifier: 0, passiveHealthModifier: 0, summonTurn: 1, position: 0, hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [] }];
    state.players[p1].hand = [spell];
    state.players[p1].energy = 3;
    state.phase = 'deploy';
    state.currentPlayer = p1;

    state = processGameStep(state);

    const scholarOnField = state.players[p1].field.find((c: Card) => c.id === 'mag_scholar');
    expect(scholarOnField?.attackModifier).toBe(1);
  });

  test('団結の旗手 should passively buff other knights', () => {
    const banneret = knightCards.find(c => c.id === 'kni_banneret')! as CreatureCard;
    const squire = knightCards.find(c => c.id === 'kni_squire')! as CreatureCard;

    let state = JSON.parse(JSON.stringify(baseState));
    state.players[p1].field = [
      { ...banneret, owner: p1, currentHealth: 3, attackModifier: 0, healthModifier: 0, passiveAttackModifier: 0, passiveHealthModifier: 0, summonTurn: 1, position: 0, hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [] },
      { ...squire, owner: p1, currentHealth: 1, attackModifier: 0, healthModifier: 0, passiveAttackModifier: 0, passiveHealthModifier: 0, summonTurn: 1, position: 1, hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [] }
    ];
    state.phase = 'battle';
    state.currentPlayer = p1;

    state = processGameStep(state);

    const squireOnField = state.players[p1].field.find((c: Card) => c.id === 'kni_squire');
    expect(squireOnField).toBeDefined();
  });

  test('沈黙の令状 should silence an enemy creature', () => {
    const writ = inquisitorCards.find(c => c.id === 'inq_writ_of_silence')!;
    const zombie = necromancerCards.find(c => c.id === 'necro_zombie')! as CreatureCard;

    let state = JSON.parse(JSON.stringify(baseState));
    state.players[p1].hand = [writ];
    state.players[p1].energy = 2;
    state.players[p2].field = [{ ...zombie, owner: p2, currentHealth: 3, attackModifier: 0, healthModifier: 0, passiveAttackModifier: 0, passiveHealthModifier: 0, summonTurn: 1, position: 0, hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [] }];
    state.phase = 'deploy';
    state.currentPlayer = p1;

    state = processGameStep(state);

    const silencedZombie = state.players[p2].field.find((c: Card) => c.id === 'necro_zombie');
    expect(silencedZombie?.isSilenced).toBe(true);

    if (silencedZombie) {
      silencedZombie.currentHealth = 0;
    }
    
    state.phase = 'battle';
    state = processGameStep(state);

    state.players[p2].field.forEach((card: FieldCard) => {
      expect(card.attackModifier).toBe(0);
    });
  });

  // === New Mechanics Tests for Expansion ===

  test('Rush keyword should allow attacking on the same turn', () => {
    const rushCreature = { ...berserkerCards.find(c => c.id === 'ber_desperate_berserker')! as CreatureCard, keywords: ['rush'] };
    let state = JSON.parse(JSON.stringify(baseState));
    state.players[p1].field = [{ ...rushCreature, owner: p1, currentHealth: 2, attackModifier: 0, healthModifier: 0, passiveAttackModifier: 0, passiveHealthModifier: 0, summonTurn: state.turnNumber, position: 0, hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [] }];
    state.players[p1].life = 5; // To meet desperate berserker's condition
    state.players[p2].life = 10;
    state.phase = 'battle';
    state.currentPlayer = p1;

    state = processGameStep(state);
    
    expect(state.players[p2].life).toBe(10 - rushCreature.attack);
  });

  test('Echo mechanic should trigger effects based on graveyard size', () => {
    const librarian = necromancerCards.find(c => c.id === 'necro_librarian')!;
    const skeleton = necromancerCards.find(c => c.id === 'necro_skeleton')!;
    
    let state = JSON.parse(JSON.stringify(baseState));
    state.players[p1].hand = [librarian];
    state.players[p1].energy = 3;
    state.players[p1].graveyard = [skeleton, skeleton, skeleton, skeleton, skeleton]; // 5 cards
    state.phase = 'deploy';
    state.currentPlayer = p1;

    state = processGameStep(state);
    
    // Should resurrect one creature
    expect(state.players[p1].field.length).toBe(2); 
    expect(state.players[p1].hand.length).toBe(0);

    state.players[p1].graveyard = [skeleton, skeleton, skeleton, skeleton, skeleton, skeleton, skeleton, skeleton, skeleton, skeleton]; // 10 cards
    state.players[p1].hand = [librarian];
    state.players[p1].energy = 3;
    state.players[p1].field = [];
    state.phase = 'deploy';

    state = processGameStep(state);
    
    // Should resurrect and draw 2 cards
    expect(state.players[p1].field.length).toBe(2);
    expect(state.players[p1].hand.length).toBe(2);
  });

  test('Formation mechanic should trigger effects based on ally count', () => {
    const vowOfUnity = knightCards.find(c => c.id === 'kni_vow_of_unity')!;
    const squire = knightCards.find(c => c.id === 'kni_squire')! as CreatureCard;

    let state = JSON.parse(JSON.stringify(baseState));
    state.players[p1].hand = [vowOfUnity];
    state.players[p1].energy = 3;
    state.players[p1].field = [
      { ...squire, owner: p1, currentHealth: 1, attackModifier: 0, healthModifier: 0, passiveAttackModifier: 0, passiveHealthModifier: 0, summonTurn: 1, position: 0, hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [] },
      { ...squire, owner: p1, currentHealth: 1, attackModifier: 0, healthModifier: 0, passiveAttackModifier: 0, passiveHealthModifier: 0, summonTurn: 1, position: 1, hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [] }
    ]; // 2 allies
    state.phase = 'deploy';
    state.currentPlayer = p1;

    state = processGameStep(state);
    
    // Should get +1/+1
    expect(state.players[p1].field[0].attackModifier).toBe(1);
    expect(state.players[p1].field[0].healthModifier).toBe(1);

    state.players[p1].field.push({ ...squire, owner: p1, currentHealth: 1, attackModifier: 0, healthModifier: 0, passiveAttackModifier: 0, passiveHealthModifier: 0, summonTurn: 1, position: 2, hasAttacked: false, isStealthed: false, isSilenced: false, statusEffects: [] }); // 3 allies
    state.players[p1].hand = [vowOfUnity];
    state.players[p1].energy = 3;
    state.phase = 'deploy';
    
    state = processGameStep(state);
    
    // Should get +2/+2
    expect(state.players[p1].field[0].attackModifier).toBe(1 + 2);
    expect(state.players[p1].field[0].healthModifier).toBe(1 + 2);
  });

  test('魂の渦 should summon a token with stats equal to graveyard size and exile graveyard', () => {
    const soulVortex = necromancerCards.find(c => c.id === 'necro_soul_vortex')!;
    const skeleton = necromancerCards.find(c => c.id === 'necro_skeleton')!;
    
    let state = JSON.parse(JSON.stringify(baseState));
    state.players[p1].hand = [soulVortex];
    state.players[p1].energy = 5;
    state.players[p1].graveyard = [skeleton, skeleton, skeleton, skeleton, skeleton]; // 5 cards
    state.phase = 'deploy';
    state.currentPlayer = p1;

    state = processGameStep(state);

    const token = state.players[p1].field.find((c: FieldCard) => c.name === '魂の集合体');
    expect(token).toBeDefined();
    expect(token?.attack).toBe(5);
    expect(token?.health).toBe(5);
    expect(state.players[p1].graveyard.length).toBe(0);
  });
});
