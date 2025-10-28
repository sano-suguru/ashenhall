/**
 * ログアクション分布調査スクリプト
 * 実際の対戦でどのアクションタイプがどの程度発生するか分析
 */

import { executeFullGame } from '@/lib/game-engine/core';
import { sampleDecks } from '@/data/decks/sample-decks';
import { getCardById } from '@/data/cards/base-cards';
import type { Card, GameAction } from '@/types/game';

const necromancerDeck = sampleDecks.find((d) => d.faction === 'necromancer')!;
const berserkerDeck = sampleDecks.find((d) => d.faction === 'berserker')!;

const player1Deck: Card[] = necromancerDeck.cardIds.map((id) => getCardById(id)).filter(Boolean) as Card[];
const player2Deck: Card[] = berserkerDeck.cardIds.map((id) => getCardById(id)).filter(Boolean) as Card[];

console.log('🔍 ログアクション分布調査開始\n');

const result = executeFullGame('log-analysis', player1Deck, player2Deck, 'necromancer', 'berserker', 'log-analysis-seed');

// アクションタイプ別カウント
const actionCounts: Record<string, number> = {};
const actionExamples: Record<string, GameAction> = {};

result.actionLog.forEach((action) => {
  const type = action.type;
  actionCounts[type] = (actionCounts[type] || 0) + 1;
  if (!actionExamples[type]) {
    actionExamples[type] = action;
  }
});

// 総アクション数
const totalActions = result.actionLog.length;

console.log(`📊 総アクション数: ${totalActions}`);
console.log(`⏱️  総ターン数: ${result.result?.totalTurns || 'N/A'}\n`);

// 頻度順にソート
const sortedTypes = Object.entries(actionCounts)
  .sort((a, b) => b[1] - a[1])
  .map(([type, count]) => ({
    type,
    count,
    percentage: ((count / totalActions) * 100).toFixed(1),
  }));

console.log('📈 アクションタイプ別分布:\n');
sortedTypes.forEach(({ type, count, percentage }) => {
  const bar = '█'.repeat(Math.floor(parseInt(percentage) / 2));
  console.log(`${type.padEnd(20)} ${count.toString().padStart(4)} (${percentage.padStart(5)}%) ${bar}`);
});

console.log('\n🎯 各アクションタイプの例:\n');
sortedTypes.forEach(({ type }) => {
  const example = actionExamples[type];
  console.log(`[${type}]`);
  console.log(`  Sequence: #${example.sequence}`);
  console.log(`  Data: ${JSON.stringify(example.data).substring(0, 100)}...`);
  console.log('');
});

// ユーザー視点での重要度分類
console.log('\n🔍 重要度による分類提案:\n');

const highPriority = ['card_play', 'card_attack', 'creature_destroyed', 'effect_trigger', 'keyword_trigger'];
const mediumPriority = ['phase_change', 'card_draw', 'energy_refill'];
const lowPriority = ['combat_stage', 'end_stage', 'energy_update', 'trigger_event'];

const highCount = sortedTypes.filter(s => highPriority.includes(s.type)).reduce((sum, s) => sum + s.count, 0);
const mediumCount = sortedTypes.filter(s => mediumPriority.includes(s.type)).reduce((sum, s) => sum + s.count, 0);
const lowCount = sortedTypes.filter(s => lowPriority.includes(s.type)).reduce((sum, s) => sum + s.count, 0);

console.log(`🔴 高優先度（常に表示）: ${highCount} (${((highCount/totalActions)*100).toFixed(1)}%)`);
console.log(`   ${highPriority.join(', ')}`);
console.log('');
console.log(`🟡 中優先度（オプション）: ${mediumCount} (${((mediumCount/totalActions)*100).toFixed(1)}%)`);
console.log(`   ${mediumPriority.join(', ')}`);
console.log('');
console.log(`⚪ 低優先度（デバッグ時のみ）: ${lowCount} (${((lowCount/totalActions)*100).toFixed(1)}%)`);
console.log(`   ${lowPriority.join(', ')}`);

console.log('\n💡 提案: 高優先度のみ表示すると、ログ量が約', ((highCount/totalActions)*100).toFixed(1), '%に削減されます');
