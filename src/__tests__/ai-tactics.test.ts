import {
  evaluateCardForPlay,
  calculateBaseScore,
  calculateFactionBonus,
} from '@/lib/game-engine/ai-tactics';
import type { GameState, Card, PlayerId, FieldCard, CreatureCard } from '@/types/game';

// モックデータとヘルパー関数
const createMockCard = (overrides: Partial<Card>): Card => {
  const baseCard = {
    id: 'test-card',
    name: 'Test Card',
    cost: 3,
    faction: 'necromancer',
    effects: [],
    keywords: [],
    flavor: '',
  };

  if (overrides.type === 'spell') {
    return {
      ...baseCard,
      type: 'spell',
      ...overrides,
    } as Card;
  }

  // デフォルトまたは明示的に指定された場合はクリーチャーを作成
  return {
    ...baseCard,
    type: 'creature',
    attack: 3,
    health: 3,
    ...overrides,
  } as Card;
};

const createMockFieldCard = (card: Card, owner: PlayerId, position: number): FieldCard => {
  if (card.type !== 'creature') {
    throw new Error('Only creature cards can be on the field');
  }
  return {
    ...card,
    owner,
    position,
    currentHealth: card.health,
    attackModifier: 0,
    healthModifier: 0,
    passiveAttackModifier: 0,
    passiveHealthModifier: 0,
    summonTurn: 1,
    hasAttacked: false,
    isStealthed: false,
    isSilenced: false,
    statusEffects: [],
    readiedThisTurn: false,
  };
};

const createMockGameState = (overrides: Partial<GameState>): GameState => ({
  gameId: 'test-game',
  randomSeed: 'test-seed',
  turnNumber: 1,
  phase: 'deploy',
  currentPlayer: 'player1',
  startTime: Date.now(),
  players: {
    player1: {
      id: 'player1',
      life: 15,
      energy: 3,
      maxEnergy: 3,
      deck: [],
      hand: [],
      field: [],
      graveyard: [],
      faction: 'necromancer',
      tacticsType: 'balanced',
    },
    player2: {
      id: 'player2',
      life: 15,
      energy: 3,
      maxEnergy: 3,
      deck: [],
      hand: [],
      field: [],
      graveyard: [],
      faction: 'knight',
      tacticsType: 'balanced',
    },
  },
  actionLog: [],
  ...overrides,
});

describe('evaluateCardForPlay (Before Refactoring)', () => {
  let gameState: GameState;
  const playerId: PlayerId = 'player1';

  beforeEach(() => {
    gameState = createMockGameState({});
  });

  it('should return a baseline score for a balanced creature', () => {
    const card = createMockCard({ type: 'creature', attack: 3, health: 3, cost: 3 });
    const score = evaluateCardForPlay(card, gameState, playerId);
    expect(score).toBeCloseTo((3 + 3) / 3);
  });

  it('should value attack higher for aggressive tactics', () => {
    gameState.players.player1.tacticsType = 'aggressive';
    const card = createMockCard({ type: 'creature', attack: 4, health: 2, cost: 3 });
    const score = evaluateCardForPlay(card, gameState, playerId);
    // 4 * 2 + 2 - 3 = 7
    expect(score).toBe(7);
  });

  it('should value health higher for defensive tactics', () => {
    gameState.players.player1.tacticsType = 'defensive';
    const card = createMockCard({ type: 'creature', attack: 2, health: 4, cost: 3 });
    const score = evaluateCardForPlay(card, gameState, playerId);
    // 4 * 2 + 2 - 3 = 7
    expect(score).toBe(7);
  });

  it('should give bonus to necromancer for echo card based on graveyard size', () => {
    gameState.players.player1.faction = 'necromancer';
    gameState.players.player1.graveyard = [createMockCard({ type: 'creature' }), createMockCard({ type: 'creature' })];
    const card = createMockCard({ type: 'creature', keywords: ['echo'] });
    const score = evaluateCardForPlay(card, gameState, playerId);
    // baseScore + graveyard.length * 3 = 2 + 2 * 3 = 8
    expect(score).toBe(8);
  });

  it('should give bonus to knight for formation card based on field size', () => {
    gameState.players.player1.faction = 'knight';
    const creatureCard = createMockCard({ type: 'creature' }) as CreatureCard;
    gameState.players.player1.field = [
      createMockFieldCard(creatureCard, 'player1', 0)
    ];
    const card = createMockCard({ keywords: ['formation'], type: 'creature' });
    const score = evaluateCardForPlay(card, gameState, playerId);
    // baseScore + field.length * 4 = 2 + 1 * 4 = 6
    expect(score).toBe(6);
  });

  it('should give bonus to mage for spell cards', () => {
    gameState.players.player1.faction = 'mage';
    const card = createMockCard({ type: 'spell', cost: 4 });
    const score = evaluateCardForPlay(card, gameState, playerId);
    // baseScore (cost * 1.5) + factionBonus (15) = 6 + 15 = 21
    expect(score).toBe(21);
  });
});

// ここからリファクタリング後のヘルパー関数のテスト
describe('AI Tactics Scorers (After Refactoring)', () => {
  let gameState: GameState;
  const playerId: PlayerId = 'player1';

  beforeEach(() => {
    gameState = createMockGameState({});
  });

  describe('calculateBaseScore', () => {
    it('calculates score for spell card', () => {
      const card = createMockCard({ type: 'spell', cost: 4 });
      expect(calculateBaseScore(card, gameState, playerId)).toBe(6);
    });

    it('uses the correct tactics scorer for creature', () => {
      gameState.players.player1.tacticsType = 'aggressive';
      const card = createMockCard({ type: 'creature', attack: 5, health: 1, cost: 3 });
      // 5 * 2 + 1 - 3 = 8
      expect(calculateBaseScore(card, gameState, playerId)).toBe(8);
    });
  });

  describe('calculateFactionBonus', () => {
    it('calculates bonus for Necromancer', () => {
      gameState.players.player1.faction = 'necromancer';
      gameState.players.player1.graveyard = [createMockCard({}), createMockCard({})];
      const card = createMockCard({ keywords: ['echo'] });
      expect(calculateFactionBonus(card, gameState, playerId)).toBe(6);
    });

    it('calculates bonus for Knight', () => {
      gameState.players.player1.faction = 'knight';
      const card = createMockCard({ keywords: ['guard'] });
      expect(calculateFactionBonus(card, gameState, playerId)).toBe(6);
    });

    it('returns 0 for a faction with no specific bonus for the card', () => {
      gameState.players.player1.faction = 'berserker';
      const card = createMockCard({ keywords: ['guard'] }); // Berserker has no guard bonus
      expect(calculateFactionBonus(card, gameState, playerId)).toBe(0);
    });
  });
});
