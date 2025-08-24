import { getEffectText, KEYWORD_DEFINITIONS } from '../lib/card-text-utils';
import { ALL_CARDS, getCardById } from '../data/cards/base-cards';
import type { Card, Keyword } from '../types/game';

describe('card-text-utils', () => {
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

    it('《断罪の宣告》のstun効果テキストが正しく生成されること', () => {
      const card = getCardById('inq_verdict_of_conviction');
      expect(card).toBeDefined();
      const effect = card!.effects[0];
      const text = getEffectText(effect, card!.type);
      expect(text).toBe('使用時: ランダムな敵1体は、次のターン攻撃できない。');
    });

    it('guardアクションのテキストが正しく生成されること', () => {
      const effect: Card['effects'][0] = {
        trigger: 'on_play',
        action: 'guard',
        target: 'self',
        value: 0,
      };
      const text = getEffectText(effect, 'creature');
      expect(text).toBe('召喚時: 自身に守護を付与する。');
    });

    it('destroy_all_creaturesアクションのテキストが正しく生成されること', () => {
      const effect: Card['effects'][0] = {
        trigger: 'on_play',
        action: 'destroy_all_creatures',
        target: 'enemy_all', // targetは使われないはずだが念のため設定
        value: 0,
      };
      const text = getEffectText(effect, 'spell');
      expect(text).toBe('使用時: 全てのクリーチャーを破壊する。');
    });
  });

  describe('KEYWORD_DEFINITIONS', () => {
    const allKeywords = new Set<Keyword>();
    ALL_CARDS.forEach(card => {
      card.keywords.forEach(kw => allKeywords.add(kw));
    });

    it.each([...allKeywords])(
      'キーワード「%s」に定義が存在すること',
      (keyword) => {
        expect(KEYWORD_DEFINITIONS[keyword]).toBeDefined();
        expect(KEYWORD_DEFINITIONS[keyword].name).not.toBe('');
        expect(KEYWORD_DEFINITIONS[keyword].description).not.toBe('');
      }
    );
  });
});
