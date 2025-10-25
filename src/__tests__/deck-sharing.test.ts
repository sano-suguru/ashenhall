import { encodeDeck, decodeDeck } from '@/lib/deck-sharing';
import type { CustomDeck } from '@/types/game';

describe('Deck Sharing Utilities (v2)', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  const sampleDeck: Pick<CustomDeck, 'faction' | 'coreCardIds' | 'cards'> = {
    faction: 'necromancer',
    coreCardIds: ['necro_lich'],
    cards: [
      'necro_skeleton', 'necro_skeleton', 'necro_zombie', 'necro_lich', 'necro_lich', 'necro_lich'
    ],
  };

  it('should correctly encode a deck object into a short base64url string', () => {
    const code = encodeDeck(sampleDeck);
    expect(typeof code).toBe('string');
    expect(code.length).toBeLessThan(100); // Expecting a much shorter string now
    expect(code).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it('should correctly decode a valid deck code back to a deck object', () => {
    const code = encodeDeck(sampleDeck);
    const decoded = decodeDeck(code);
    expect(decoded).toEqual(sampleDeck);
  });

  it('should return null for an invalid base64 string', () => {
    const invalidCode = 'this is not base64';
    const decoded = decodeDeck(invalidCode);
    expect(decoded).toBeNull();
    
    // console.errorが正しく呼ばれたことを検証
    expect(errorSpy).toHaveBeenCalledWith('Failed to decode deck code:', expect.any(Error));
  });

  it('should return null for a code with an incorrect version', () => {
    // Manually create a v1 code to test backward compatibility failure
    const rawString = `v1:${sampleDeck.faction}:${sampleDeck.coreCardIds.join(',')}:${sampleDeck.cards.join(',')}`;
    const base64 = Buffer.from(rawString).toString('base64');
    const code = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const decoded = decodeDeck(code);
    expect(decoded).toBeNull();
    
    // console.errorが正しく呼ばれたことを検証
    expect(errorSpy).toHaveBeenCalledWith('Invalid deck code format or version.');
  });

  it('should return null for a code with invalid card integer IDs', () => {
    const rawString = 'v2:0:999:999'; // 999 is an invalid card index
    const base64 = Buffer.from(rawString).toString('base64');
    const badCode = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const decoded = decodeDeck(badCode);
    expect(decoded).toBeNull();
    
    // console.errorが正しく呼ばれたことを検証
    expect(errorSpy).toHaveBeenCalledWith('Deck code contains invalid card IDs.');
  });

  it('should return null for a code with an invalid faction integer ID', () => {
    const rawString = 'v2:99:1:1,2,3'; // 99 is an invalid faction index
    const base64 = Buffer.from(rawString).toString('base64');
    const badCode = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const decoded = decodeDeck(badCode);
    expect(decoded).toBeNull();
    
    // console.errorが正しく呼ばれたことを検証
    expect(errorSpy).toHaveBeenCalledWith('Invalid faction ID in deck code.');
  });

  it('should handle empty core card and card arrays', () => {
    const emptyDeck: Pick<CustomDeck, 'faction' | 'coreCardIds' | 'cards'> = {
      faction: 'mage',
      coreCardIds: [],
      cards: [],
    };
    const code = encodeDeck(emptyDeck);
    const decoded = decodeDeck(code);
    expect(decoded).toEqual(emptyDeck);
  });

  it('should sanitize duplicate or out-of-deck core card IDs when decoding', () => {
    const deckWithIssues: Pick<CustomDeck, 'faction' | 'coreCardIds' | 'cards'> = {
      faction: 'necromancer',
      coreCardIds: ['necro_lich', 'necro_lich', 'necro_skeleton'],
      cards: [
        'necro_lich', 'necro_lich', 'necro_lich',
        'necro_zombie', 'necro_zombie', 'necro_zombie',
      ],
    };

    const code = encodeDeck(deckWithIssues);
    const decoded = decodeDeck(code);
    expect(decoded).not.toBeNull();
    expect(decoded?.coreCardIds).toEqual(['necro_lich']);
  });
});
