/**
 * 戦狂いカード - 自己犠牲と爆発力
 * 
 * 設計方針:
 * - 高攻撃力・低体力のアグレッシブな構成
 * - 死亡時効果による最後の一撃
 * - 体力が減ることで強くなる背水の陣戦術
 */

import type { CardTemplate } from '@/types/cards';

/** 戦狂いカード - 攻撃力重視と破壊的効果 */
export const berserkerCards: CardTemplate[] = [
  {
    templateId: 'ber_warrior',
    name: '狂戦士',
    type: 'creature',
    faction: 'berserker',
    cost: 2,
    attack: 3, // 2.5 → 3 (整数化、効果補正-1考慮で適正値)
    health: 1,
    keywords: [],
    effects: [
      {
        trigger: 'on_death',
        target: 'enemy_all',
        action: 'damage',
        value: 1,
      },
    ],
    flavor: '鋼の歌声響く時、血は最も美しく輝く',
  },
  {
    templateId: 'ber_berserker',
    name: '血染めの戦士',
    type: 'creature',
    faction: 'berserker',
    cost: 1,
    attack: 1, // バランス調整: 2/1 → 1/1
    health: 1,
    keywords: [],
    effects: [
      {
        trigger: 'on_play',
        target: 'self',
        action: 'buff_attack',
        value: 1,
      },
    ],
    flavor: '真紅に染まる刃に、魂の咆哮を込めて',
  },
  {
    templateId: 'ber_champion',
    name: '英雄殺し',
    type: 'creature',
    faction: 'berserker',
    cost: 3,
    attack: 4,
    health: 3, // 2.5 → 3 (整数化、効果なしで総合値7)
    keywords: [],
    effects: [],
    flavor: '一撃に全てを託す者の、純粋なる美学',
  },
  {
    templateId: 'ber_raider',
    name: '略奪団首領',
    type: 'creature',
    faction: 'berserker',
    cost: 2,
    attack: 2,
    health: 1, // バランス調整: 2/2 → 2/1
    keywords: [],
    effects: [
      {
        trigger: 'turn_start',
        target: 'ally_all',
        action: 'buff_attack',
        value: 1,
      },
    ],
    flavor: '戦場に響く雄叫びが、仲間の血を沸かす',
  },
  {
    templateId: 'ber_fury',
    name: '憤怒の戦士',
    type: 'creature',
    faction: 'berserker',
    cost: 1,
    attack: 1,
    health: 1, // 効果補正-1考慮で適正値維持
    keywords: [],
    effects: [
      {
        trigger: 'on_death',
        target: 'ally_random',
        action: 'buff_attack',
        value: 2,
      },
    ],
    flavor: '燃え尽きる炎が残すは、不屈の意志',
  },
  {
    templateId: 'ber_bomber',
    name: '爆破兵',
    type: 'creature',
    faction: 'berserker',
    cost: 2,
    attack: 2, // 1.5 → 2 (整数化、効果補正-1考慮で適正値)
    health: 2,
    keywords: [],
    effects: [
      {
        trigger: 'on_play',
        target: 'enemy_all',
        action: 'damage',
        value: 1,
      },
    ],
    flavor: '混沌の中にこそ、真の戦の美が宿る',
  },
  {
    templateId: 'ber_craver',
    name: '血の渇望者',
    type: 'creature',
    faction: 'berserker',
    cost: 3,
    attack: 3,
    health: 3,
    keywords: ['lifesteal'],
    effects: [],
    flavor: '敵の血こそ、我が渇きを癒す唯一の泉。',
  },
  {
    templateId: 'ber_last_stand',
    name: '最後の抵抗',
    type: 'spell',
    faction: 'berserker',
    cost: 1,
    keywords: [],
    effects: [
      {
        trigger: 'on_play',
        target: 'enemy_all',
        action: 'damage',
        value: 3,
        activationCondition: { subject: 'playerLife', operator: 'lte', value: 7 },
      },
    ],
    flavor: '追い詰められた獣こそ、最も牙を剥く。',
  },
  {
    templateId: 'ber_thorn_orc',
    name: '棘の鎧のオーク',
    type: 'creature',
    faction: 'berserker',
    cost: 3,
    attack: 2,
    health: 2,
    keywords: [],
    effects: [
      {
        trigger: 'on_damage_taken',
        target: 'player',
        action: 'damage',
        value: 1,
      },
    ],
    flavor: '近づけば血を流すことになるぞ。それでも来るか？',
  },
  {
    templateId: 'ber_desperate_berserker',
    name: '背水の狂戦士',
    type: 'creature',
    faction: 'berserker',
    cost: 4,
    attack: 7,
    health: 2,
    keywords: ['trample'],
    effects: [
      {
        trigger: 'on_attack',
        target: 'self',
        action: 'ready',
        value: 1,
        activationCondition: { subject: 'playerLife', operator: 'lt', value: 'opponentLife' },
      },
    ],
    flavor: '死の淵こそ我が故郷。貴様も故郷に還りたくなったか？',
  },
  {
    templateId: 'ber_blood_awakening',
    name: '血の覚醒',
    type: 'spell',
    faction: 'berserker',
    cost: 2,
    keywords: [],
    effects: [
      {
        trigger: 'on_play',
        target: 'ally_random',
        action: 'buff_attack',
        value: 3,
      },
      {
        trigger: 'on_play',
        target: 'ally_random',
        action: 'buff_health',
        value: 3,
      },
      {
        trigger: 'on_play',
        target: 'player',
        action: 'damage',
        value: 3,
      },
    ],
    flavor: '痛みこそが力を研ぎ澄ます。傷なき戦士に栄光はない。',
  },
];
