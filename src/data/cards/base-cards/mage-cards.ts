/**
 * 魔導士カード - 魔法効果とエレメンタル
 * 
 * 設計方針:
 * - スペル詠唱による間接攻撃
 * - カードドローと情報優位
 * - 魔法相互作用による複合効果
 */

import type { CardTemplate } from '@/types/cards';

/** 魔導士カード - 知恵と戦術の極致 */
export const mageCards: CardTemplate[] = [
  {
    templateId: 'mag_apprentice',
    name: '術師見習い',
    type: 'creature',
    faction: 'mage',
    cost: 1,
    attack: 1,
    health: 2, // Phase 1調整: 1 → 2 (過去の弱体化を戻す、序盤の盤面確保)
    keywords: [],
    effects: [
      {
        trigger: 'on_play',
        target: 'self',
        action: 'draw_card',
        value: 1,
      },
    ],
    flavor: '星々が囁く古き秘密を、若き瞳は求め続ける',
  },
  {
    templateId: 'mag_arcane',
    name: '秘術師',
    type: 'creature',
    faction: 'mage',
    cost: 3,
    attack: 2,
    health: 3, // 効果補正-1.5考慮で適正値維持
    keywords: [],
    effects: [
      {
        trigger: 'turn_end',
        target: 'ally_all',
        action: 'buff_health',
        value: 1,
      },
    ],
    flavor: '失われし文字に刻まれた、永遠なる加護の術',
  },
  {
    templateId: 'mag_familiar',
    name: '魔法の眷属',
    type: 'creature',
    faction: 'mage',
    cost: 1,
    attack: 2, // Phase 1調整: 1 → 2 (死亡時効果を活かす攻撃性)
    health: 1,
    keywords: [],
    effects: [
      {
        trigger: 'on_death',
        target: 'self',
        action: 'draw_card',
        value: 1,
      },
    ],
    flavor: '主への献身が、最後の叡智となりて',
  },
  {
    templateId: 'mag_golem',
    name: '秘術人形',
    type: 'creature',
    faction: 'mage',
    cost: 3,
    attack: 2,
    health: 3, // バランス調整: 2/4 → 2/3
    keywords: [],
    effects: [
      {
        trigger: 'passive',
        target: 'ally_all',
        action: 'buff_health',
        value: 1,
      },
    ],
    flavor: '古代の意志を宿せし、石と鋼の忠実な僕',
  },
  {
    templateId: 'mag_elementalist',
    name: '元素使い',
    type: 'creature',
    faction: 'mage',
    cost: 2,
    attack: 2,
    health: 2,
    keywords: [],
    effects: [
      {
        trigger: 'on_play',
        target: 'enemy_random',
        action: 'damage',
        value: 3, // Phase 1調整: 2 → 3 (序盤の除去性能強化)
      },
    ],
    flavor: '火と氷の調べに、天地の律動を重ねて',
  },
  {
    templateId: 'mag_storm',
    name: '嵐の魔導士',
    type: 'creature',
    faction: 'mage',
    cost: 2,
    attack: 3, // 2.5 → 3 (整数化、効果補正-1考慮で適正値)
    health: 1,
    keywords: [],
    effects: [
      {
        trigger: 'on_play',
        target: 'enemy_all',
        action: 'debuff_attack',
        value: 1,
      },
    ],
    flavor: '天空の怒りを纏い、雷鳴と共に舞い踊る',
  },
  {
    templateId: 'mag_torrent',
    name: '魔力の奔流',
    type: 'spell',
    faction: 'mage',
    cost: 3,
    keywords: [],
    playConditions: [
      {
        subject: 'enemyCreatureCount',
        operator: 'gte',
        value: 1,
      },
    ],
    effects: [
      {
        trigger: 'on_play',
        target: 'enemy_all',
        action: 'damage',
        value: 2,
      },
    ],
    flavor: '言葉は力。古の言葉は、世界そのものを揺るがす。',
  },
  {
    templateId: 'mag_scholar',
    name: '魔力循環の学者',
    type: 'creature',
    faction: 'mage',
    cost: 2,
    attack: 1,
    health: 3,
    keywords: [],
    effects: [
      {
        trigger: 'on_spell_play',
        target: 'self',
        action: 'buff_attack',
        value: 1,
      },
    ],
    flavor: '流れよ、我が知識となれ。',
  },
  {
    templateId: 'mag_arcane_lightning',
    name: '秘術の連雷',
    type: 'spell',
    faction: 'mage',
    cost: 4,
    keywords: [],
    playConditions: [
      {
        subject: 'enemyCreatureCount',
        operator: 'gte',
        value: 1,
      },
    ],
    effects: [
      {
        trigger: 'on_play',
        target: 'enemy_random',
        action: 'damage',
        value: 3,
        chainOnKill: {
          action: 'damage',
          value: 2,
          target: 'enemy_random',
          excludeOriginalTarget: true,
        },
      },
    ],
    flavor: '第一の雷は序曲にすぎぬ。真の嵐は、その後に訪れる。',
  },
  {
    templateId: 'mag_chant_avatar',
    name: '詠唱の化身',
    type: 'creature',
    faction: 'mage',
    cost: 2,
    attack: 0,
    health: 4,
    keywords: [],
    effects: [
      {
        trigger: 'on_spell_play',
        target: 'player',
        action: 'damage',
        value: 1,
      },
    ],
    flavor: '彼は言葉を話さぬ。ただ、流れ込む魔力を純粋な破壊の力へと変えるのみ。',
  },
  {
    templateId: 'mag_stargazer_sage',
    name: '星見の賢者',
    type: 'creature',
    faction: 'mage',
    cost: 3,
    attack: 2,
    health: 3,
    keywords: [],
    effects: [
      {
        trigger: 'on_spell_play',
        target: 'self',
        action: 'buff_attack',
        value: 1,
      },
      {
        trigger: 'on_spell_play',
        target: 'self',
        action: 'buff_health',
        value: 1,
      },
    ],
    flavor: '星を読むのではない。星を動かすのだ、我らの望むがままに。',
  },
  {
    templateId: 'mag_reality_collapse',
    name: '理の崩壊',
    type: 'spell',
    faction: 'mage',
    cost: 3,
    keywords: [],
    effects: [
      {
        trigger: 'on_play',
        target: 'enemy_random',
        action: 'swap_attack_health',
        value: 1,
      },
      {
        trigger: 'on_play',
        target: 'self',
        action: 'draw_card',
        value: 1,
      },
    ],
    flavor: '数字の羅列に意味はない。我らが定義を与えるまでは。',
  },
];
