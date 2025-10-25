/**
 * デッキ共有ユーティリティ
 * 
 * 設計方針:
 * - デッキデータをURLセーフな文字列にエンコード/デコードする機能を提供
 * - サーバーサイドとクライアントサイドの両方で利用可能な純粋関数として実装
 * - カードIDを数値化することで、生成されるコードを大幅に短縮
 */

import type { CustomDeck, Faction } from '@/types/game';
import { 
  cardIdToIntegerMap,
  integerToCardIdMap,
  factionToIntegerMap,
  integerToFactionMap
} from './card-id-manager';
import { sanitizeCoreCardIds } from './deck-utils';

// デッキコードのバージョンと区切り文字を定義
const DECK_CODE_VERSION = 'v2'; // バージョンを更新
const PART_SEPARATOR = ':';
const CARD_SEPARATOR = ',';

/**
 * デッキオブジェクトをURLセーフなBase64エンコードされたデッキコードに変換します。
 * @param deck - エンコードするデッキオブジェクト
 * @returns URLセーフなデッキコード文字列
 */
export function encodeDeck(deck: Pick<CustomDeck, 'faction' | 'coreCardIds' | 'cards'>): string {
  const factionInt = factionToIntegerMap.get(deck.faction);
  const coreInts = deck.coreCardIds.map(id => cardIdToIntegerMap.get(id));
  const cardInts = deck.cards.map(id => cardIdToIntegerMap.get(id));

  if (factionInt === undefined || coreInts.includes(undefined) || cardInts.includes(undefined)) {
    throw new Error('Invalid card or faction ID found during encoding.');
  }

  const coreStr = coreInts.join(CARD_SEPARATOR);
  const cardsStr = cardInts.join(CARD_SEPARATOR);
  
  const rawDeckString = [
    DECK_CODE_VERSION,
    factionInt,
    coreStr,
    cardsStr
  ].join(PART_SEPARATOR);

  if (typeof window !== 'undefined') {
    // Browser environment
    const base64 = window.btoa(unescape(encodeURIComponent(rawDeckString)));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  } else {
    // Node.js environment
    return Buffer.from(rawDeckString).toString('base64url');
  }
}

/**
 * Base64文字列をプレーンテキストにデコードします（環境対応）
 * @param code - デコードするBase64コード
 * @returns デコードされた文字列
 * @throws エラーが発生した場合は例外をスロー
 */
function decodeBase64String(code: string): string {
  if (typeof window !== 'undefined') {
    // Browser environment
    let base64 = code.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return decodeURIComponent(escape(window.atob(base64)));
  } else {
    // Node.js environment
    return Buffer.from(code, 'base64url').toString('utf-8');
  }
}

/**
 * デッキコード文字列を構成要素に分割し、バージョンを検証します
 * @param decodedString - デコードされたプレーンテキスト
 * @returns パースされたデッキデータ、またはエラーの場合はnull
 */
function parseDeckCodeParts(decodedString: string): {
  factionStr: string;
  coreStr: string;
  cardsStr: string;
} | null {
  const parts = decodedString.split(PART_SEPARATOR);

  if (parts.length !== 4 || parts[0] !== DECK_CODE_VERSION) {
    console.error('Invalid deck code format or version.');
    return null;
  }

  const [, factionStr, coreStr, cardsStr] = parts;
  return { factionStr, coreStr, cardsStr };
}

/**
 * 文字列形式のID群を実際のオブジェクトIDに変換します
 * @param parsedData - パースされたデッキデータ
 * @returns 変換されたデッキデータ、またはエラーの場合はnull
 */
function convertDeckData(parsedData: {
  factionStr: string;
  coreStr: string;
  cardsStr: string;
}): {
  faction: Faction;
  coreCardIds: string[];
  cards: string[];
  originalCoreParts: string[];
  originalCardParts: string[];
} | null {
  const { factionStr, coreStr, cardsStr } = parsedData;
  
  const factionInt = parseInt(factionStr, 10);
  const faction = integerToFactionMap.get(factionInt);

  if (!faction) {
    console.error('Invalid faction ID in deck code.');
    return null;
  }

  const originalCoreParts = coreStr ? coreStr.split(CARD_SEPARATOR) : [];
  const originalCardParts = cardsStr ? cardsStr.split(CARD_SEPARATOR) : [];

  const coreCardIds = originalCoreParts.map(s => integerToCardIdMap.get(parseInt(s, 10))).filter((s): s is string => s !== undefined);
  const cards = originalCardParts.map(s => integerToCardIdMap.get(parseInt(s, 10))).filter((s): s is string => s !== undefined);

  return {
    faction,
    coreCardIds,
    cards,
    originalCoreParts,
    originalCardParts,
  };
}

/**
 * 変換されたデータの完全性を検証します
 * @param convertedData - 変換されたデッキデータ
 * @returns 検証結果（true: 正常, false: エラー）
 */
function validateDeckIntegrity(convertedData: {
  coreCardIds: string[];
  cards: string[];
  originalCoreParts: string[];
  originalCardParts: string[];
}): boolean {
  const { coreCardIds, cards, originalCoreParts, originalCardParts } = convertedData;
  
  // IDの完全性を検証
  if (coreCardIds.length !== originalCoreParts.length ||
      cards.length !== originalCardParts.length) {
    console.error('Deck code contains invalid card IDs.');
    return false;
  }

  return true;
}

/**
 * URLセーフなBase64エンコードされたデッキコードをデッキオブジェクトにデコードします。
 * @param code - デコードするデッキコード文字列
 * @returns デコードされたデッキデータ、またはエラーの場合はnull
 */
export function decodeDeck(code: string): Pick<CustomDeck, 'faction' | 'coreCardIds' | 'cards'> | null {
  try {
    const decodedString = decodeBase64String(code);
    if (!decodedString) return null;
    
    const parsedData = parseDeckCodeParts(decodedString);
    if (!parsedData) return null;
    
    const convertedData = convertDeckData(parsedData);
    if (!convertedData) return null;
    
    const isValid = validateDeckIntegrity(convertedData);
    if (!isValid) return null;
    
    const sanitizedCoreCardIds = sanitizeCoreCardIds(convertedData.coreCardIds, convertedData.cards);

    return {
      faction: convertedData.faction,
      coreCardIds: sanitizedCoreCardIds,
      cards: convertedData.cards,
    };
  } catch (error) {
    console.error('Failed to decode deck code:', error);
    return null;
  }
}
