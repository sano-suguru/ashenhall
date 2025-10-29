import { validateDeck, normalizeDeckCoreCards, loadDeckCollection } from '../lib/deck-utils';
import type { CustomDeck } from '../types/game';
import { GAME_CONSTANTS } from '../types/game';

// テスト用のヘルパー関数
const fillDeck = (cards: string[]): string[] => {
  const filled = [...cards];
  while (filled.length < GAME_CONSTANTS.DECK_SIZE) {
    filled.push(`filler-${filled.length}`);
  }
  return filled;
};

describe('validateDeck', () => {
  const baseDeck: Omit<CustomDeck, 'cards' | 'coreCardIds'> = {
    id: 'test-deck',
    name: 'Test Deck',
    faction: 'berserker',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('should return valid for a correct deck', () => {
    const cards = fillDeck(['card-1', 'card-2']);
    const deck: CustomDeck = {
      ...baseDeck,
      cards,
      coreCardIds: [],
    };
    const { isValid, errors } = validateDeck(deck);
    expect(isValid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('should return invalid if deck size is incorrect', () => {
    const deck: CustomDeck = {
      ...baseDeck,
      cards: Array(19).fill('card-1'),
      coreCardIds: [],
    };
    const { isValid, errors } = validateDeck(deck);
    expect(isValid).toBe(false);
    expect(errors[0]).toContain(`デッキの枚数は${GAME_CONSTANTS.DECK_SIZE}枚である必要があります`);
  });

  it('should allow up to 2 copies of a non-core card', () => {
    const cards = fillDeck(['card-1', 'card-1']);
    const deck: CustomDeck = { ...baseDeck, cards, coreCardIds: [] };
    const { isValid } = validateDeck(deck);
    expect(isValid).toBe(true);
  });

  it('should return invalid for 3 copies of a non-core card', () => {
    const cards = fillDeck(['card-1', 'card-1', 'card-1']);
    const deck: CustomDeck = { ...baseDeck, cards, coreCardIds: [] };
    const { isValid, errors } = validateDeck(deck);
    expect(isValid).toBe(false);
    expect(errors[0]).toContain('カード「card-1」は2枚までしか入れられません');
  });

  it('should allow up to 3 copies of a core card', () => {
    const cards = fillDeck(['card-1', 'card-1', 'card-1']);
    const deck: CustomDeck = { ...baseDeck, cards, coreCardIds: ['card-1'] };
    const { isValid } = validateDeck(deck);
    expect(isValid).toBe(true);
  });

  it('should return invalid for 4 copies of a core card', () => {
    const cards = fillDeck(['card-1', 'card-1', 'card-1', 'card-1']);
    const deck: CustomDeck = { ...baseDeck, cards, coreCardIds: ['card-1'] };
    const { isValid, errors } = validateDeck(deck);
    expect(isValid).toBe(false);
    expect(errors[0]).toContain('カード「card-1」は3枚までしか入れられません');
  });

  it('should return invalid if more than 3 core cards are selected', () => {
    const cards = fillDeck([
      'core-1',
      'core-1',
      'core-2',
      'core-2',
      'core-3',
      'core-3',
      'core-4',
      'core-4',
    ]);
    const deck: CustomDeck = {
      ...baseDeck,
      cards,
      coreCardIds: ['core-1', 'core-2', 'core-3', 'core-4'],
    };
    const { isValid, errors } = validateDeck(deck);
    expect(isValid).toBe(false);
    expect(errors.some((e) => e.includes('コアカードは3枚までしか指定できません'))).toBe(true);
  });

  it('should return invalid when coreCardIds includes duplicates', () => {
    const cards = fillDeck(['card-1']);
    const deck: CustomDeck = {
      ...baseDeck,
      cards,
      coreCardIds: ['card-1', 'card-1'],
    };
    const { isValid, errors } = validateDeck(deck);
    expect(isValid).toBe(false);
    expect(errors.some((e) => e.includes('コアカードの指定に重複があります'))).toBe(true);
  });

  it('should return invalid when coreCardIds references cards not in the deck', () => {
    const cards = fillDeck(['card-1']);
    const deck: CustomDeck = {
      ...baseDeck,
      cards,
      coreCardIds: ['card-2'],
    };
    const { isValid, errors } = validateDeck(deck);
    expect(isValid).toBe(false);
    expect(errors.some((e) => e.includes('コアカードにデッキ外のカードが含まれています'))).toBe(
      true
    );
  });

  it('normalizeDeckCoreCards should dedupe, drop missing cards, and enforce max 3 entries', () => {
    const cards = fillDeck([
      'card-1',
      'card-1',
      'card-2',
      'card-2',
      'card-3',
      'card-3',
      'card-4',
      'card-4',
    ]);
    const originalCoreCardIds = ['card-1', 'card-1', 'card-2', 'card-3', 'card-4', 'card-5'];
    const deck: CustomDeck = {
      ...baseDeck,
      cards,
      coreCardIds: [...originalCoreCardIds],
    };

    const normalized = normalizeDeckCoreCards(deck);
    expect(deck.coreCardIds).toEqual(originalCoreCardIds);
    expect(normalized.coreCardIds).toEqual(['card-1', 'card-2', 'card-3']);
  });

  it('normalizeDeckCoreCards should return the original reference when no changes are needed', () => {
    const cards = fillDeck(['card-1', 'card-1']);
    const deck: CustomDeck = {
      ...baseDeck,
      cards,
      coreCardIds: ['card-1'],
    };
    const normalized = normalizeDeckCoreCards(deck);
    expect(normalized).toBe(deck);
  });

  it('loadDeckCollection should normalize legacy stored decks', () => {
    const legacyCollection = {
      decks: [
        {
          ...baseDeck,
          cards: fillDeck(['card-1', 'card-1', 'card-2', 'card-2']),
          coreCardIds: ['card-1', 'card-1', 'card-2', 'card-3'],
        },
      ],
      activeDeckIds: {},
    };

    localStorage.setItem('ashenhall_deck_collection', JSON.stringify(legacyCollection));

    const loaded = loadDeckCollection();
    expect(loaded.decks[0].coreCardIds).toEqual(['card-1', 'card-2']);

    const storedAgain = JSON.parse(localStorage.getItem('ashenhall_deck_collection') || '{}');
    expect(storedAgain.decks[0].coreCardIds).toEqual(['card-1', 'card-2']);

    localStorage.clear();
  });
});
