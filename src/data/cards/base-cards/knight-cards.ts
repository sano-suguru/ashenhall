/**
 * 騎士カード - 連携効果と回復
 *
 * 設計方針:
 * - 仲間との連携による相乗効果
 * - 回復とサポートによる持久戦
 * - 守護による戦線維持
 */

import type { CardTemplate } from '@/types/cards';

/** 騎士カード - 秩序と結束の力 */
export const knightCards: CardTemplate[] = [
  {
    templateId: 'kni_squire',
    name: '見習い騎士',
    type: 'creature',
    faction: 'knight',
    cost: 1,
    attack: 1,
    health: 2,
    keywords: [],
    effects: [
      {
        trigger: 'on_play',
        target: 'ally_all',
        action: 'heal',
        value: 2, // バランス調整R4: 1 → 2 (回復力向上)
      },
    ],
    flavor: '小さき光も、共に在れば闇を払う',
  },
  {
    templateId: 'kni_paladin',
    name: '聖騎士',
    type: 'creature',
    faction: 'knight',
    cost: 2,
    attack: 2,
    health: 2,
    keywords: [],
    effects: [
      {
        trigger: 'turn_start',
        target: 'ally_all',
        action: 'heal',
        value: 1,
      },
    ],
    flavor: '黄金の鷲が舞う空に、癒しの光は降り注ぐ',
  },
  {
    templateId: 'kni_templar',
    name: '聖堂騎士',
    type: 'creature',
    faction: 'knight',
    cost: 3,
    attack: 2,
    health: 4,
    keywords: ['guard'],
    effects: [],
    flavor: '神聖なる誓いに宿る、不屈の守護',
  },
  {
    templateId: 'kni_guardian',
    name: '守護騎士',
    type: 'creature',
    faction: 'knight',
    cost: 2,
    attack: 1,
    health: 4, // バランス調整R7: 3 → 4 (守護役の耐久力向上)
    keywords: ['guard'],
    effects: [],
    flavor: '我が盾に込めし祈りよ、永遠に仲間を護れ',
  },
  {
    templateId: 'kni_crusader',
    name: '十字軍騎士',
    type: 'creature',
    faction: 'knight',
    cost: 1,
    attack: 3, // バランス調整R7: 2 → 3 (序盤の攻撃力向上)
    health: 1,
    keywords: [],
    effects: [
      {
        trigger: 'on_play',
        target: 'ally_random',
        action: 'buff_attack',
        value: 1,
      },
    ],
    flavor: '仲間への信頼が、我が剣に力を与える',
  },
  {
    templateId: 'kni_chaplain',
    name: '従軍僧',
    type: 'creature',
    faction: 'knight',
    cost: 1,
    attack: 1,
    health: 1,
    keywords: [],
    effects: [
      {
        trigger: 'on_death',
        target: 'ally_all',
        action: 'heal',
        value: 3, // バランス調整R6: 2 → 3 (死亡時回復を強化)
      },
    ],
    flavor: '最後の祈りに込める、永遠なる加護',
  },
  {
    templateId: 'kni_vindicator',
    name: '報復の聖騎士',
    type: 'creature',
    faction: 'knight',
    cost: 2,
    attack: 2,
    health: 3,
    keywords: ['retaliate'],
    effects: [],
    flavor: '受けた祈りは、倍の祈りて返すべし。',
  },
  {
    templateId: 'kni_banneret',
    name: '団結の旗手',
    type: 'creature',
    faction: 'knight',
    cost: 3,
    attack: 2,
    health: 3,
    keywords: [],
    effects: [
      {
        trigger: 'passive',
        target: 'ally_all',
        action: 'buff_attack',
        value: 1,
      },
    ],
    flavor: 'この旗の下に、我らは一つ。',
  },
  {
    templateId: 'kni_sanctuary_prayer',
    name: '聖域の祈り',
    type: 'spell',
    faction: 'knight',
    cost: 3,
    keywords: [],
    effects: [
      {
        trigger: 'on_play',
        target: 'ally_all',
        action: 'heal',
        value: 1,
        dynamicValue: { source: 'field', filter: 'alive' },
      },
    ],
    flavor: '一人一人の祈りは小さくとも、共に捧げれば天に届く奇跡となる。',
  },
  {
    templateId: 'kni_white_wing_marshal',
    name: '白翼の元帥',
    type: 'creature',
    faction: 'knight',
    cost: 4,
    attack: 3,
    health: 4,
    keywords: [],
    effects: [
      {
        trigger: 'passive',
        target: 'ally_all',
        action: 'buff_attack',
        value: 1,
        selectionRules: [{ type: 'exclude_self', operator: 'eq', value: true }],
      },
    ],
    flavor: '恐れるな、我が翼の元に集え！光は我らと共にある！',
  },
  {
    templateId: 'kni_galleon',
    name: '不動の聖壁、ガレオン',
    type: 'creature',
    faction: 'knight',
    cost: 5,
    attack: 2,
    health: 5,
    keywords: ['guard', 'formation'],
    effects: [
      {
        trigger: 'passive',
        target: 'self',
        action: 'buff_attack',
        value: 1,
        dynamicValue: { source: 'field', filter: 'exclude_self' },
      },
    ],
    flavor: '我が身は騎士団の礎。我が魂は仲間たちの盾。この誓いが破られることはない。',
  },
  {
    templateId: 'kni_vow_of_unity',
    name: '団結の誓い',
    type: 'spell',
    faction: 'knight',
    cost: 3,
    keywords: ['formation'],
    effects: [
      {
        trigger: 'on_play',
        target: 'ally_all',
        action: 'buff_attack',
        value: 2,
        activationCondition: { subject: 'allyCount', operator: 'gte', value: 3 },
      },
      {
        trigger: 'on_play',
        target: 'ally_all',
        action: 'buff_health',
        value: 2,
        activationCondition: { subject: 'allyCount', operator: 'gte', value: 3 },
      },
      {
        trigger: 'on_play',
        target: 'ally_all',
        action: 'buff_attack',
        value: 1, // バランス調整R5: 2 → 1 (R4で強化しすぎたため戻す)
        activationCondition: { subject: 'allyCount', operator: 'lt', value: 3 },
      },
      {
        trigger: 'on_play',
        target: 'ally_all',
        action: 'buff_health',
        value: 1, // バランス調整R5: 2 → 1 (R4で強化しすぎたため戻す)
        activationCondition: { subject: 'allyCount', operator: 'lt', value: 3 },
      },
    ],
    flavor: '一人一人の祈りは小さくとも、共に捧げれば天に届く奇跡となる。',
  },
];
