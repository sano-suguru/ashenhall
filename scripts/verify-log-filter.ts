/**
 * ログフィルタリング効果の検証スクリプト
 * Phase 1-A 実装後の改善効果を確認
 */

import { executeFullGame } from '@/lib/game-engine/core';
import { sampleDecks } from '@/data/decks/sample-decks';
import { getCardById } from '@/data/cards/base-cards';
import type { Card } from '@/types/game';
import { INTERNAL_LOG_TYPES } from '@/constants/log-constants';

const necromancerDeck = sampleDecks.find((d) => d.faction === 'necromancer')!;
const berserkerDeck = sampleDecks.find((d) => d.faction === 'berserker')!;

const player1Deck: Card[] = necromancerDeck.cardIds
  .map((id) => getCardById(id))
  .filter(Boolean) as Card[];
const player2Deck: Card[] = berserkerDeck.cardIds
  .map((id) => getCardById(id))
  .filter(Boolean) as Card[];

console.log('🔍 Phase 1-A フィルタリング効果検証\n');

const result = executeFullGame(
  'filter-test',
  player1Deck,
  player2Deck,
  'necromancer',
  'berserker',
  'test-seed'
);

const totalActions = result.actionLog.length;
const filteredActions = result.actionLog.filter((a) => !INTERNAL_LOG_TYPES.includes(a.type));
const removedCount = totalActions - filteredActions.length;

console.log('📊 フィルタリング効果:');
console.log(`   総アクション数: ${totalActions}`);
console.log(`   表示アクション: ${filteredActions.length}`);
console.log(`   除外アクション: ${removedCount}`);
console.log(`   削減率: ${((removedCount / totalActions) * 100).toFixed(1)}%\n`);

console.log('✨ RecentLog(最新10件)の表示改善:');
console.log('\n【変更前】最新10件（生ログ）:');
result.actionLog.slice(-10).forEach((action) => {
  const isInternal = INTERNAL_LOG_TYPES.includes(action.type);
  const mark = isInternal ? '❌' : '✅';
  console.log(`   ${mark} #${action.sequence} [${action.type}]`);
});

console.log('\n【変更後】最新10件（フィルタ済）:');
filteredActions.slice(-10).forEach((action) => {
  console.log(`   ✅ #${action.sequence} [${action.type}]`);
});

console.log('\n🎯 改善ポイント:');
console.log(`   - 内部処理ログが非表示に`);
console.log(`   - 重要イベント（召喚/攻撃/破壊）の視認性向上`);
console.log(`   - RecentLog(10件)でカバーするターン数が増加`);
