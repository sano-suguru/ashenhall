/**
 * 戦狂いバランス修正テスト
 * 
 * 2025-10-19: 戦狂いの過剰な強さを修正
 * - スターター勝率: 80.0% → 目標65%以下
 * - サンプル勝率: 68.5% → 目標60%以下
 * 
 * 修正内容:
 * 1. 狂戦士: 3/1 → 2/1
 * 2. 英雄殺し: 4/3 → 3/3
 * 3. 背水の狂戦士: 7/2 → 5/2
 * 4. 最後の抵抗: 全体3ダメージ → 全体2ダメージ
 * 5. 血の覚醒: 自傷3 → 自傷4
 */

import { describe, test, expect } from '@jest/globals';
import { getCardById } from '@/data/cards/base-cards';
import type { CreatureCard, SpellCard } from '@/types/game';

describe('戦狂いバランス修正', () => {

  describe('狂戦士 (ber_warrior)', () => {
    test('攻撃力が2に調整されている', () => {
      const card = getCardById('ber_warrior') as CreatureCard;
      expect(card).toBeDefined();
      expect(card.attack).toBe(2);
      expect(card.health).toBe(1);
    });

    test('死亡時効果の定義が正しい', () => {
      const card = getCardById('ber_warrior') as CreatureCard;
      const effect = card.effects[0];
      
      expect(effect.trigger).toBe('on_death');
      expect(effect.action).toBe('damage');
      expect(effect.target).toBe('enemy_all');
      expect(effect.value).toBe(1);
    });
  });

  describe('英雄殺し (ber_champion)', () => {
    test('攻撃力が3に調整されている', () => {
      const card = getCardById('ber_champion') as CreatureCard;
      expect(card).toBeDefined();
      expect(card.attack).toBe(3);
      expect(card.health).toBe(3);
      expect(card.cost).toBe(3);
    });

    test('効果を持たないバニラクリーチャーである', () => {
      const card = getCardById('ber_champion') as CreatureCard;
      expect(card.effects.length).toBe(0);
    });
  });

  describe('背水の狂戦士 (ber_desperate_berserker)', () => {
    test('攻撃力が5に調整されている', () => {
      const card = getCardById('ber_desperate_berserker') as CreatureCard;
      expect(card).toBeDefined();
      expect(card.attack).toBe(5);
      expect(card.health).toBe(2);
      expect(card.cost).toBe(4);
    });

    test('蹂躙キーワードを持つ', () => {
      const card = getCardById('ber_desperate_berserker') as CreatureCard;
      expect(card.keywords).toContain('trample');
    });

    test('条件付き再攻撃効果の基本プロパティを持つ', () => {
      const card = getCardById('ber_desperate_berserker') as CreatureCard;
      const effect = card.effects.find(e => e.action === 'ready');
      
      expect(effect).toBeDefined();
      expect(effect?.trigger).toBe('on_attack');
      expect(effect?.target).toBe('self');
      expect(effect?.value).toBe(1);
    });

    test('ライフ条件による発動制限を持つ', () => {
      const card = getCardById('ber_desperate_berserker') as CreatureCard;
      const effect = card.effects.find(e => e.action === 'ready');
      
      expect(effect?.activationCondition).toBeDefined();
      expect(effect?.activationCondition?.subject).toBe('playerLife');
      expect(effect?.activationCondition?.operator).toBe('lt');
      expect(effect?.activationCondition?.value).toBe('opponentLife');
    });
  });

  describe('最後の抵抗 (ber_last_stand)', () => {
    test('ダメージが2に調整されている', () => {
      const card = getCardById('ber_last_stand') as SpellCard;
      expect(card).toBeDefined();
      expect(card.cost).toBe(1);
      
      const effect = card.effects[0];
      expect(effect.action).toBe('damage');
      expect(effect.value).toBe(2); // 3から2に変更
    });

    test('条件付き敵全体ダメージ効果を持つ', () => {
      const card = getCardById('ber_last_stand') as SpellCard;
      const effect = card.effects[0];
      
      expect(effect.trigger).toBe('on_play');
      expect(effect.target).toBe('enemy_all');
      expect(effect.action).toBe('damage');
      
      // ライフ条件の検証
      expect(effect.activationCondition).toBeDefined();
      expect(effect.activationCondition?.subject).toBe('playerLife');
      expect(effect.activationCondition?.operator).toBe('lte');
      expect(effect.activationCondition?.value).toBe(7);
    });

  });

  describe('血の覚醒 (ber_blood_awakening)', () => {
    test('自傷ダメージが4に調整されている', () => {
      const card = getCardById('ber_blood_awakening') as SpellCard;
      expect(card).toBeDefined();
      expect(card.cost).toBe(2);
      expect(card.effects.length).toBe(3);

      // 自傷効果を検証
      const selfDamageEffect = card.effects.find(
        e => e.target === 'player' && e.action === 'damage'
      );
      
      expect(selfDamageEffect).toBeDefined();
      expect(selfDamageEffect?.value).toBe(4); // 3から4に変更
    });

    test('3つの効果を持つ（攻撃バフ、体力バフ、自傷）', () => {
      const card = getCardById('ber_blood_awakening') as SpellCard;
      const effects = card.effects;

      // 攻撃バフ
      const attackBuff = effects.find(e => e.action === 'buff_attack');
      expect(attackBuff).toBeDefined();
      expect(attackBuff?.target).toBe('ally_random');
      expect(attackBuff?.value).toBe(3);

      // 体力バフ
      const healthBuff = effects.find(e => e.action === 'buff_health');
      expect(healthBuff).toBeDefined();
      expect(healthBuff?.target).toBe('ally_random');
      expect(healthBuff?.value).toBe(3);

      // 自傷
      const selfDamage = effects.find(e => e.action === 'damage' && e.target === 'player');
      expect(selfDamage).toBeDefined();
      expect(selfDamage?.value).toBe(4);
    });

  });

  describe('バランス修正の統合検証', () => {
    test('全ての修正カードが正しい数値を持つ', () => {
      const warrior = getCardById('ber_warrior') as CreatureCard;
      const champion = getCardById('ber_champion') as CreatureCard;
      const desperate = getCardById('ber_desperate_berserker') as CreatureCard;
      const lastStand = getCardById('ber_last_stand') as SpellCard;
      const bloodAwakening = getCardById('ber_blood_awakening') as SpellCard;

      expect(warrior.attack).toBe(2);
      expect(champion.attack).toBe(3);
      expect(desperate.attack).toBe(5);
      expect(lastStand.effects[0].value).toBe(2);
      
      const selfDamage = bloodAwakening.effects.find(
        e => e.target === 'player' && e.action === 'damage'
      );
      expect(selfDamage?.value).toBe(4);
    });

    test('修正されたカードは全て戦狂い勢力である', () => {
      const cards = [
        'ber_warrior',
        'ber_champion',
        'ber_desperate_berserker',
        'ber_last_stand',
        'ber_blood_awakening',
      ];

      cards.forEach(templateId => {
        const card = getCardById(templateId);
        expect(card?.faction).toBe('berserker');
      });
    });
  });
});
