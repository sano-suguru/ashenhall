/**
 * カスタムデッキ管理ユーティリティ
 *
 * 設計方針:
 * - localStorageとのやり取りを抽象化
 * - デッキデータのCRUD操作を提供
 * - UUIDによる一意なデッキ識別
 */

import type { DeckCollection, CustomDeck, Faction } from '@/types/game';
import { GAME_CONSTANTS } from '@/types/game';
import { logError } from './error-handling';

const DECK_STORAGE_KEY = 'ashenhall_deck_collection';

type CoreCardAnalysis = {
  uniqueCoreCardIds: string[];
  duplicateCoreCardIds: string[];
  missingCoreCardIds: string[];
};

function analyzeCoreCardIds(coreCardIds: string[] = [], deckCards: string[]): CoreCardAnalysis {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  coreCardIds.forEach((cardId) => {
    if (seen.has(cardId)) {
      duplicates.add(cardId);
      return;
    }
    seen.add(cardId);
  });

  const deckCardSet = new Set(deckCards);
  const uniqueCoreCardIds = Array.from(seen);
  const missingCoreCardIds = uniqueCoreCardIds.filter((cardId) => !deckCardSet.has(cardId));

  return {
    uniqueCoreCardIds,
    duplicateCoreCardIds: Array.from(duplicates),
    missingCoreCardIds,
  };
}

export function sanitizeCoreCardIds(coreCardIds: string[] = [], deckCards: string[]): string[] {
  const { uniqueCoreCardIds, missingCoreCardIds } = analyzeCoreCardIds(coreCardIds, deckCards);
  if (missingCoreCardIds.length === 0) {
    return uniqueCoreCardIds;
  }

  const missingSet = new Set(missingCoreCardIds);
  return uniqueCoreCardIds.filter((cardId) => !missingSet.has(cardId));
}

function areArraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((value, index) => value === b[index]);
}

export function normalizeDeckCoreCards(deck: CustomDeck): CustomDeck {
  const sanitizedCoreCardIds = sanitizeCoreCardIds(deck.coreCardIds, deck.cards);
  const trimmedCoreCardIds =
    sanitizedCoreCardIds.length > 3 ? sanitizedCoreCardIds.slice(0, 3) : sanitizedCoreCardIds;

  if (areArraysEqual(trimmedCoreCardIds, deck.coreCardIds)) {
    return deck;
  }

  return {
    ...deck,
    coreCardIds: trimmedCoreCardIds,
  };
}

/**
 * 乱数生成器（簡易的なUUID用）
 */
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 初期状態のデッキコレクションを生成
 */
function getInitialDeckCollection(): DeckCollection {
  return {
    decks: [],
    activeDeckIds: {},
  };
}

/**
 * localStorageからデッキコレクションを読み込む
 */
export function loadDeckCollection(): DeckCollection {
  try {
    const storedDecks = localStorage.getItem(DECK_STORAGE_KEY);
    if (storedDecks) {
      const parsed = JSON.parse(storedDecks) as DeckCollection;
      const normalizedDecks = parsed.decks.map(normalizeDeckCoreCards);
      if (
        areArraysEqual(
          normalizedDecks.map((d) => d.id),
          parsed.decks.map((d) => d.id)
        )
      ) {
        let requiresUpdate = false;
        const updatedDecks = parsed.decks.map((deck, index) => {
          const normalized = normalizedDecks[index];
          if (normalized !== deck) {
            requiresUpdate = true;
            return normalized;
          }
          return deck;
        });
        if (requiresUpdate) {
          const normalizedCollection: DeckCollection = {
            ...parsed,
            decks: updatedDecks,
          };
          saveDeckCollection(normalizedCollection);
          return normalizedCollection;
        }
      }
      return parsed;
    }
  } catch (error) {
    logError('Failed to load deck collection from localStorage', error);
  }
  return getInitialDeckCollection();
}

/**
 * localStorageにデッキコレクションを保存する
 */
export function saveDeckCollection(deckCollection: DeckCollection): void {
  try {
    const decksString = JSON.stringify(deckCollection);
    localStorage.setItem(DECK_STORAGE_KEY, decksString);
  } catch (error) {
    logError('Failed to save deck collection to localStorage', error);
  }
}

/**
 * 新しいカスタムデッキを作成
 */
export function createNewDeck(name: string, faction: Faction): CustomDeck {
  const newDeck: CustomDeck = {
    id: uuidv4(),
    name,
    faction,
    cards: [],
    coreCardIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return newDeck;
}

/**
 * デッキをコレクションに追加
 */
export function addDeckToCollection(collection: DeckCollection, deck: CustomDeck): DeckCollection {
  const deckToStore = normalizeDeckCoreCards(deck);
  const newCollection = { ...collection, decks: [...collection.decks, deckToStore] };
  return newCollection;
}

/**
 * デッキを更新
 */
export function updateDeckInCollection(
  collection: DeckCollection,
  updatedDeck: CustomDeck
): DeckCollection {
  const deckToStore = {
    ...normalizeDeckCoreCards(updatedDeck),
    updatedAt: new Date().toISOString(),
  };
  const newDecks = collection.decks.map((deck) =>
    deck.id === updatedDeck.id ? deckToStore : deck
  );
  return { ...collection, decks: newDecks };
}

/**
 * デッキを削除
 */
export function deleteDeckFromCollection(
  collection: DeckCollection,
  deckId: string
): DeckCollection {
  const newDecks = collection.decks.filter((deck) => deck.id !== deckId);
  const newActiveDeckIds = { ...collection.activeDeckIds };

  // 削除したデッキがアクティブだった場合は解除
  Object.entries(newActiveDeckIds).forEach(([faction, id]) => {
    if (id === deckId) {
      delete newActiveDeckIds[faction as Faction];
    }
  });

  return { decks: newDecks, activeDeckIds: newActiveDeckIds };
}

/**
 * 特定の勢力のアクティブデッキを設定
 */
export function setActiveDeckForFaction(
  collection: DeckCollection,
  faction: Faction,
  deckId: string | null
): DeckCollection {
  const newActiveDeckIds = { ...collection.activeDeckIds };
  if (deckId) {
    newActiveDeckIds[faction] = deckId;
  } else {
    delete newActiveDeckIds[faction];
  }
  return { ...collection, activeDeckIds: newActiveDeckIds };
}

/**
 * デッキの妥当性チェック
 */
export function validateDeck(deck: CustomDeck): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const { duplicateCoreCardIds, missingCoreCardIds, uniqueCoreCardIds } = analyzeCoreCardIds(
    deck.coreCardIds,
    deck.cards
  );

  const effectiveCoreCardIds = sanitizeCoreCardIds(uniqueCoreCardIds, deck.cards);
  const coreCardSet = new Set(effectiveCoreCardIds);

  // デッキ枚数チェック
  if (deck.cards.length !== GAME_CONSTANTS.DECK_SIZE) {
    errors.push(
      `デッキの枚数は${GAME_CONSTANTS.DECK_SIZE}枚である必要があります。 (現在: ${deck.cards.length}枚)`
    );
  }

  if (duplicateCoreCardIds.length > 0) {
    errors.push(`コアカードの指定に重複があります: ${duplicateCoreCardIds.join(', ')}`);
  }

  if (missingCoreCardIds.length > 0) {
    errors.push(`コアカードにデッキ外のカードが含まれています: ${missingCoreCardIds.join(', ')}`);
  }

  // 同名カード制限チェック
  const cardCounts = deck.cards.reduce(
    (acc, cardId) => {
      acc[cardId] = (acc[cardId] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  Object.entries(cardCounts).forEach(([cardId, count]) => {
    const isCore = coreCardSet.has(cardId);
    const limit = isCore ? 3 : GAME_CONSTANTS.CARD_COPY_LIMIT;
    if (count > limit) {
      errors.push(`カード「${cardId}」は${limit}枚までしか入れられません。 (現在: ${count}枚)`);
    }
  });

  // コアカードの数チェック
  if (effectiveCoreCardIds.length > 3) {
    errors.push(`コアカードは3枚までしか指定できません。 (現在: ${effectiveCoreCardIds.length}枚)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
