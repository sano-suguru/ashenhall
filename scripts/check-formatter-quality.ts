/**
 * フォーマッター改善候補の検証
 * Phase 1-B: ユーザーフレンドリーな表現への変更が必要な箇所を特定
 */

import { executeFullGame } from '@/lib/game-engine/core';
import { sampleDecks } from '@/data/decks/sample-decks';
import { getCardById } from '@/data/cards/base-cards';
import { getLogDisplayParts } from '@/lib/game-state-utils';
import type { Card, GameAction } from '@/types/game';

const necromancerDeck = sampleDecks.find((d) => d.faction === 'necromancer')!;
const berserkerDeck = sampleDecks.find((d) => d.faction === 'berserker')!;

const player1Deck: Card[] = necromancerDeck.cardIds.map((id) => getCardById(id)).filter(Boolean) as Card[];
const player2Deck: Card[] = berserkerDeck.cardIds.map((id) => getCardById(id)).filter(Boolean) as Card[];

console.log('🔍 Phase 1-B: フォーマッター改善箇所の特定\n');

const result = executeFullGame('formatter-test', player1Deck, player2Deck, 'necromancer', 'berserker', 'fmt-seed');

// 各タイプのサンプルを収集
const samplesByType: Record<string, { action: GameAction; formatted: string }[]> = {};

result.actionLog.forEach((action) => {
  if (!samplesByType[action.type]) {
    samplesByType[action.type] = [];
  }
  
  if (samplesByType[action.type].length < 3) {
    const parts = getLogDisplayParts(action, result);
    const formatted = `[${parts.playerName}] ${parts.message}${parts.details ? ` ${parts.details}` : ''}`;
    samplesByType[action.type].push({ action, formatted });
  }
});

console.log('📝 各アクションタイプの実際の表示例:\n');

// 改善が必要な順にソート
const improvementNeeded = [
  'end_stage',
  'combat_stage',
  'trigger_event',
  'energy_update',
];

const goodEnough = [
  'card_draw',
  'energy_refill',
  'phase_change',
];

const alreadyGood = [
  'card_play',
  'card_attack',
  'creature_destroyed',
  'effect_trigger',
  'keyword_trigger',
];

console.log('🔴 改善必須（開発者向け表記）:\n');
improvementNeeded.forEach((type) => {
  if (samplesByType[type]) {
    console.log(`[${type}]`);
    samplesByType[type].forEach((sample, i) => {
      console.log(`  ${i + 1}. ${sample.formatted}`);
    });
    console.log('');
  }
});

console.log('🟡 改善推奨（やや技術的）:\n');
goodEnough.forEach((type) => {
  if (samplesByType[type]) {
    console.log(`[${type}]`);
    samplesByType[type].forEach((sample, i) => {
      console.log(`  ${i + 1}. ${sample.formatted}`);
    });
    console.log('');
  }
});

console.log('✅ 良好（ユーザーフレンドリー）:\n');
alreadyGood.forEach((type) => {
  if (samplesByType[type]) {
    console.log(`[${type}]`);
    samplesByType[type].forEach((sample, i) => {
      console.log(`  ${i + 1}. ${sample.formatted}`);
    });
    console.log('');
  }
});

console.log('\n💡 Phase 1-B 改善方針:');
console.log('   1. 🔴 改善必須 → フィルタで非表示（Phase 1-A完了）');
console.log('   2. 🟡 改善推奨 → ユーザー向け表現に改善');
console.log('   3. ✅ 良好 → 現状維持');
