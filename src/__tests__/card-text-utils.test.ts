import { getEffectText } from '../lib/card-text-utils';
import { ALL_CARDS } from '../data/cards/base-cards';
import type { Card } from '../types/game';

describe('getEffectText', () => {
  // 全カードの全効果をテストデータとして動的に生成
  const allEffects: { card: Card; effect: Card['effects'][0] }[] = [];
  ALL_CARDS.forEach(card => {
    card.effects.forEach(effect => {
      allEffects.push({ card, effect });
    });
  });

  it.each(allEffects)(
    'カード「$card.name」の効果 ($effect.trigger, $effect.action) がエラーなくテキストに変換されること',
    ({ card, effect }) => {
      const text = getEffectText(effect, card.type);
      
      // 未定義の文字列が含まれていないことを確認
      expect(text).not.toContain('[未定義トリガー');
      expect(text).not.toContain('[未定義アクション');
      expect(text).not.toContain('undefined'); // 予期せぬundefinedがないか
    }
  );
});
