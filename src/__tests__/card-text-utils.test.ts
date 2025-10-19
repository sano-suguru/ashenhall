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
        const text = getEffectText(effect, card.type, card.templateId);

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

    describe('条件付き効果のテキスト生成', () => {
      it('《信仰の鎖》の条件付きドロー効果が正しく表示されること', () => {
        const card = getCardById('inq_chain_of_faith');
        expect(card).toBeDefined();
        const drawEffect = card!.effects.find(e => e.action === 'draw_card');
        expect(drawEffect).toBeDefined();
        const text = getEffectText(drawEffect!, card!.type);
        expect(text).toBe('烙印を刻まれた敵がいる場合、使用時: カードを1枚引く。');
      });

      it('《最後の抵抗》のライフ条件が正しく表示されること', () => {
        const card = getCardById('ber_last_stand');
        expect(card).toBeDefined();
        const effect = card!.effects[0];
        const text = getEffectText(effect, card!.type);
        // バランス調整: ダメージが3→2に変更されました
        expect(text).toBe('あなたのライフが7以下の場合、使用時: 敵全体に2ダメージを与える。');
      });

      it('《背水の狂戦士》のライフ比較条件が正しく表示されること', () => {
        const card = getCardById('ber_desperate_berserker');
        expect(card).toBeDefined();
        const readyEffect = card!.effects.find(e => e.action === 'ready');
        expect(readyEffect).toBeDefined();
        const text = getEffectText(readyEffect!, card!.type);
        expect(text).toBe('相手よりライフが少ない場合、このクリーチャーが攻撃する時: このターン、もう一度だけ攻撃できる。');
      });

      it('《聖域の見張り》の否定条件が正しく表示されること', () => {
        const card = getCardById('inq_sanctuary_guard');
        expect(card).toBeDefined();
        const damageEffect = card!.effects.find(e => e.action === 'damage' && e.target === 'self');
        expect(damageEffect).toBeDefined();
        const text = getEffectText(damageEffect!, card!.type);
        expect(text).toBe('烙印を刻まれた敵がいない場合、ターン終了時: 自身に2ダメージを与える。');
      });

      it('《囁きの書庫番》の墓地条件が正しく表示されること', () => {
        const card = getCardById('necro_librarian');
        expect(card).toBeDefined();
        const resurrectEffect = card!.effects.find(e => e.action === 'resurrect');
        expect(resurrectEffect).toBeDefined();
        const text = getEffectText(resurrectEffect!, card!.type);
        expect(text).toBe('墓地のカード数が4以上の場合、召喚時: あなたの墓地からコスト1以下のクリーチャーを1体戦場に戻す。');
      });

      it('《団結の誓い》の味方数条件が正しく表示されること', () => {
        const card = getCardById('kni_vow_of_unity');
        expect(card).toBeDefined();
        const highAllyEffect = card!.effects.find(e => 
          e.activationCondition?.subject === 'allyCount' && 
          e.activationCondition?.operator === 'gte' && 
          e.activationCondition?.value === 3
        );
        expect(highAllyEffect).toBeDefined();
        const text = getEffectText(highAllyEffect!, card!.type);
        expect(text).toBe('味方クリーチャー数が3以上の場合、使用時: 味方全体の攻撃力を+2する。');
      });

      it('条件なし効果は従来通り表示されること', () => {
        const card = getCardById('necro_skeleton');
        expect(card).toBeDefined();
        // 骸骨剣士は効果なしのカードなので、別のカードで確認
        const zombieCard = getCardById('necro_zombie');
        expect(zombieCard).toBeDefined();
        const effect = zombieCard!.effects[0];
        const text = getEffectText(effect, zombieCard!.type);
        expect(text).toBe('死亡時: 味方全体の攻撃力を+1する。');
      });
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
