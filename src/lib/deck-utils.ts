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

/**
 * 乱数生成器（簡易的なUUID用）
 */
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 初期状態のデッキコレクションを生成
 */
export function getInitialDeckCollection(): DeckCollection {
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
      return JSON.parse(storedDecks) as DeckCollection;
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
export function createNewDeck(
  collection: DeckCollection,
  name: string,
  faction: Faction
): CustomDeck {
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
export function addDeckToCollection(
  collection: DeckCollection,
  deck: CustomDeck
): DeckCollection {
  const newCollection = { ...collection, decks: [...collection.decks, deck] };
  return newCollection;
}

/**
 * デッキを更新
 */
export function updateDeckInCollection(
  collection: DeckCollection,
  updatedDeck: CustomDeck
): DeckCollection {
  const newDecks = collection.decks.map(deck =>
    deck.id === updatedDeck.id ? { ...updatedDeck, updatedAt: new Date().toISOString() } : deck
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
  const newDecks = collection.decks.filter(deck => deck.id !== deckId);
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
  const coreCardIds = deck.coreCardIds || [];

  // デッキ枚数チェック
  if (deck.cards.length !== GAME_CONSTANTS.DECK_SIZE) {
    errors.push(`デッキの枚数は${GAME_CONSTANTS.DECK_SIZE}枚である必要があります。 (現在: ${deck.cards.length}枚)`);
  }

  // 同名カード制限チェック
  const cardCounts = deck.cards.reduce((acc, cardId) => {
    acc[cardId] = (acc[cardId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(cardCounts).forEach(([cardId, count]) => {
    const isCore = coreCardIds.includes(cardId);
    const limit = isCore ? 3 : GAME_CONSTANTS.CARD_COPY_LIMIT;
    if (count > limit) {
      errors.push(`カード「${cardId}」は${limit}枚までしか入れられません。 (現在: ${count}枚)`);
    }
  });

  // コアカードの数チェック
  if (coreCardIds.length > 3) {
    errors.push(`コアカードは3枚までしか指定できません。 (現在: ${coreCardIds.length}枚)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
