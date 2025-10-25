/**
 * カードデータ統合エクスポート - 完全後方互換性保持
 * 
 * このファイルは既存の `base-cards.ts` と完全に同じAPIを提供し、
 * 既存のインポート文を一切変更せずに新しい分割構造を利用できます。
 */

// 勢力別カードの個別エクスポート（既存コード互換）
export { necromancerCards } from './base-cards/necromancer-cards';
export { berserkerCards } from './base-cards/berserker-cards';
export { mageCards } from './base-cards/mage-cards';
export { knightCards } from './base-cards/knight-cards';
export { inquisitorCards } from './base-cards/inquisitor-cards';

// 統合データと関数の再エクスポート（既存コード互換）
export {
  FACTION_CARDS,
  ALL_CARDS,
  getCardById,
  getCardsByFaction,
} from './card-registry';
