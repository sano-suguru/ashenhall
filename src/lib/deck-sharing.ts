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

// デッキコードのバージョンと区切り文字を定義
const DECK_CODE_VERSION = 'v2'; // バージョンを更新
const PART_SEPARATOR = ':';
const CORE_CARD_SEPARATOR = ';';
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
 * URLセーフなBase64エンコードされたデッキコードをデッキオブジェクトにデコードします。
 * @param code - デコードするデッキコード文字列
 * @returns デコードされたデッキデータ、またはエラーの場合はnull
 */
export function decodeDeck(code: string): Pick<CustomDeck, 'faction' | 'coreCardIds' | 'cards'> | null {
  try {
    let decodedString: string;
    if (typeof window !== 'undefined') {
      // Browser environment
      let base64 = code.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      decodedString = decodeURIComponent(escape(window.atob(base64)));
    } else {
      // Node.js environment
      decodedString = Buffer.from(code, 'base64url').toString('utf-8');
    }
    
    const parts = decodedString.split(PART_SEPARATOR);

    if (parts.length !== 4 || parts[0] !== DECK_CODE_VERSION) {
      console.error('Invalid deck code format or version.');
      return null;
    }

    const [, factionStr, coreStr, cardsStr] = parts;
    
    const factionInt = parseInt(factionStr, 10);
    const faction = integerToFactionMap.get(factionInt);

    if (!faction) {
      console.error('Invalid faction ID in deck code.');
      return null;
    }

    const coreCardIds = coreStr ? coreStr.split(CARD_SEPARATOR).map(s => integerToCardIdMap.get(parseInt(s, 10))).filter((s): s is string => s !== undefined) : [];
    const cards = cardsStr ? cardsStr.split(CARD_SEPARATOR).map(s => integerToCardIdMap.get(parseInt(s, 10))).filter((s): s is string => s !== undefined) : [];

    // IDの完全性を検証
    if (coreCardIds.length !== (coreStr ? coreStr.split(CARD_SEPARATOR).length : 0) ||
        cards.length !== (cardsStr ? cardsStr.split(CARD_SEPARATOR).length : 0)) {
      console.error('Deck code contains invalid card IDs.');
      return null;
    }

    return {
      faction,
      coreCardIds,
      cards,
    };
  } catch (error) {
    console.error('Failed to decode deck code:', error);
    return null;
  }
}
