/**
 * 基本カードデータ - Phase 0で使用する30枚のカードセット
 * 
 * 設計方針:
 * - 各勢力6枚ずつ、計30枚でバランスを取る
 * - シンプルな効果でゲームの核となる戦術を表現
 * - コスト1-3の低コストカード中心でテンポの良い戦闘を実現
 */

import type { Card, Faction } from '@/types/game';

/** 死霊術師カード - 墓地活用と復活効果 */
export const necromancerCards: Card[] = [
  {
    id: 'necro_skeleton',
    name: '骸骨剣士',
    type: 'creature',
    faction: 'necromancer',
    cost: 1,
    attack: 2,
    health: 1, // 0.5 → 1 (整数化、基本値2.5維持)
    keywords: [],
    effects: [],
    flavor: '朽ちた骨に宿るは、永遠なる戦への誓い',
  },
  {
    id: 'necro_zombie',
    name: '腐肉の護衛',
    type: 'creature',
    faction: 'necromancer',
    cost: 2,
    attack: 1,
    health: 3, // 2.5 → 3 (整数化、効果補正-1考慮で適正値)
    keywords: [],
    effects: [
      {
        trigger: 'on_death',
        target: 'ally_all',
        action: 'buff_attack',
        value: 1,
      },
    ],
    flavor: '死してなお響く、静寂への讃美歌',
  },
  {
    id: 'necro_wraith',
    name: '亡霊暗殺者',
    type: 'creature',
    faction: 'necromancer',
    cost: 3,
    attack: 3,
    health: 3, // 3.5+2.5=6 → 3+3=6 (整数化、効果補正-0.5考慮)
    keywords: [],
    effects: [
      {
        trigger: 'on_play',
        target: 'enemy_random',
        action: 'debuff_attack',
        value: 1,
      },
    ],
    flavor: '生者の血潮を凍らせる、死の囁き',
  },
  {
    id: 'necro_necromancer',
    name: '死霊法師',
    type: 'creature',
    faction: 'necromancer',
    cost: 2,
    attack: 1,
    health: 2, // 効果価値-1.5考慮で適正値維持
    keywords: [],
    effects: [
      {
        trigger: 'turn_end',
        target: 'self',
        action: 'summon',
        value: 1, // 骸骨召喚
      },
    ],
    flavor: '静寂なる王座に仕える、死者の招待者',
  },
  {
    id: 'necro_lich',
    name: '不死王',
    type: 'creature',
    faction: 'necromancer',
    cost: 3,
    attack: 3, // 2.5 → 3 (整数化、効果補正-0.5考慮で適正値)
    health: 3,
    keywords: [],
    effects: [
      {
        trigger: 'on_play',
        target: 'ally_all',
        action: 'heal',
        value: 1,
      },
    ],
    flavor: '朽ちることなき玉座に座す、永劫の統治者',
  },
  {
    id: 'necro_ghoul',
    name: '漁り食らう者',
    type: 'creature',
    faction: 'necromancer',
    cost: 1,
    attack: 1,
    health: 1, // バランス調整: 1/2 → 1/1
    keywords: [],
    effects: [
      {
        trigger: 'on_play',
        target: 'self',
        action: 'draw_card',
        value: 1,
      },
    ],
    flavor: '戦場の残骸に、古き知恵を求む者',
  },
  {
    id: 'necro_harvester',
    name: '魂の収穫者',
    type: 'creature',
    faction: 'necromancer',
    cost: 2,
    attack: 2,
    health: 2,
    keywords: [],
    effects: [
      {
        trigger: 'on_ally_death',
        target: 'self',
        action: 'buff_attack',
        value: 1,
      },
    ],
    flavor: '一つ消えるごとに、我は一つ強く。',
  },
  {
    id: 'necro_grave_master',
    name: '墓所の支配者',
    type: 'creature',
    faction: 'necromancer',
    cost: 4,
    attack: 3,
    health: 4,
    keywords: [],
    effects: [
      {
        trigger: 'on_play',
        target: 'self',
        action: 'resurrect',
        value: 1,
      },
    ],
    flavor: '死は終わりではない。我が手の中では、駒の一つに過ぎぬ。',
  },
  {
    id: 'necro_soul_offering',
    name: '魂の供物',
    type: 'spell',
    faction: 'necromancer',
    cost: 1,
    keywords: [],
    effects: [
      {
        trigger: 'on_play',
        target: 'self',
        action: 'resurrect',
        value: 2, // コスト2以下のクリーチャーを蘇生
      },
    ],
    flavor: '一つの魂は終わり、二つの魂が始まる。これぞ死の円環なり。',
  },
  {
    id: 'necro_grave_giant',
    name: '墓守の巨人',
    type: 'creature',
    faction: 'necromancer',
    cost: 4,
    attack: 3,
    health: 5,
    keywords: ['guard'],
    effects: [
      {
        trigger: 'on_play',
        target: 'self',
        action: 'buff_attack',
        value: 0, // プレースホルダー
      },
    ],
    flavor: '古の王たちの眠りを守るため、彼は死者の力をその身に宿す。',
  },
  {
    id: 'necro_librarian',
    name: '囁きの書庫番',
    type: 'creature',
    faction: 'necromancer',
    cost: 3,
    attack: 2,
    health: 2,
    keywords: ['echo'],
    effects: [
      {
        trigger: 'on_play',
        target: 'self',
        action: 'resurrect',
        value: 2,
        condition: { subject: 'graveyard', operator: 'gte', value: 5 },
      },
      {
        trigger: 'on_play',
        target: 'self',
        action: 'draw_card',
        value: 2,
        condition: { subject: 'graveyard', operator: 'gte', value: 10 },
      },
    ],
    flavor: '一冊は失われた魂の記録。十冊集えば、それは軍勢の召集令状となる。',
  },
  {
    id: 'necro_soul_vortex',
    name: '魂の渦',
    type: 'spell',
    faction: 'necromancer',
    cost: 5,
    keywords: ['echo'],
    effects: [
      {
        trigger: 'on_play',
        target: 'self',
        action: 'summon',
        value: 0, // value will be determined by graveyard size
      },
    ],
    flavor: '無数の終焉を束ね、唯一つの絶対的な始まりを告げる。',
  },
];

/** 戦狂いカード - 自己犠牲と爆発力 */
export const berserkerCards: Card[] = [
  {
    id: 'ber_warrior',
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
    id: 'ber_berserker',
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
    id: 'ber_champion',
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
    id: 'ber_raider',
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
    id: 'ber_fury',
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
    id: 'ber_bomber',
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
    id: 'ber_craver',
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
    id: 'ber_last_stand',
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
        condition: { subject: 'playerLife', operator: 'lte', value: 7 },
      },
    ],
    flavor: '追い詰められた獣こそ、最も牙を剥く。',
  },
  {
    id: 'ber_blood_awakening',
    name: '血の覚醒',
    type: 'spell',
    faction: 'berserker',
    cost: 2,
    keywords: [],
    effects: [
      {
        trigger: 'on_play',
        target: 'player',
        action: 'damage',
        value: 3,
      },
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
    ],
    flavor: '痛みこそが我らを研ぎ澄ます。傷なき戦士に栄光はない。',
  },
  {
    id: 'ber_thorn_orc',
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
    id: 'ber_desperate_berserker',
    name: '背水の狂戦士',
    type: 'creature',
    faction: 'berserker',
    cost: 4,
    attack: 7,
    health: 2,
    keywords: [],
    effects: [
      {
        trigger: 'on_attack',
        target: 'self',
        action: 'damage', // Placeholder for condition
        value: 0,
        condition: { subject: 'playerLife', operator: 'lt', value: 'opponentLife' },
      },
    ],
    flavor: '死の淵こそ我が故郷。貴様も故郷に還りたくなったか？',
  },
  {
    id: 'ber_blood_awakening_spell',
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

/** 魔導士カード - 魔法効果とエレメンタル */
export const mageCards: Card[] = [
  {
    id: 'mag_apprentice',
    name: '術師見習い',
    type: 'creature',
    faction: 'mage',
    cost: 1,
    attack: 1,
    health: 1, // バランス調整: 1/2 → 1/1
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
    id: 'mag_elementalist',
    name: '元素使い',
    type: 'creature',
    faction: 'mage',
    cost: 2,
    attack: 2, // 1.5 → 2 (整数化、効果補正-1考慮で適正値)
    health: 2,
    keywords: [],
    effects: [
      {
        trigger: 'on_play',
        target: 'enemy_random',
        action: 'damage',
        value: 2,
      },
    ],
    flavor: '火と氷の調べに、天地の律動を重ねて',
  },
  {
    id: 'mag_arcane',
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
    id: 'mag_familiar',
    name: '魔法の眷属',
    type: 'creature',
    faction: 'mage',
    cost: 1,
    attack: 1,
    health: 1, // 効果補正-0.5考慮で適正値維持
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
    id: 'mag_golem',
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
    id: 'mag_storm',
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
    id: 'mag_torrent',
    name: '魔力の奔流',
    type: 'spell',
    faction: 'mage',
    cost: 3,
    keywords: [],
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
    id: 'mag_scholar',
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
    id: 'mag_arcane_lightning',
    name: '秘術の連雷',
    type: 'spell',
    faction: 'mage',
    cost: 4,
    keywords: [],
    effects: [
      {
        trigger: 'on_play',
        target: 'enemy_random',
        action: 'damage',
        value: 3,
      },
    ],
    flavor: '第一の雷は序曲にすぎぬ。真の嵐は、その後に訪れる。',
  },
  {
    id: 'mag_chant_avatar',
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
    id: 'mag_stargazer_sage',
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
    id: 'mag_reality_collapse',
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

/** 騎士カード - 連携効果と回復 */
export const knightCards: Card[] = [
  {
    id: 'kni_squire',
    name: '見習い騎士',
    type: 'creature',
    faction: 'knight',
    cost: 1,
    attack: 1,
    health: 1, // バランス調整: 1/2 → 1/1
    keywords: [],
    effects: [
      {
        trigger: 'on_play',
        target: 'ally_all',
        action: 'heal',
        value: 1,
      },
    ],
    flavor: '小さき光も、共に在れば闇を払う',
  },
  {
    id: 'kni_paladin',
    name: '聖騎士',
    type: 'creature',
    faction: 'knight',
    cost: 2,
    attack: 2, // 1.5 → 2 (整数化、効果補正-1.5考慮)
    health: 2, // 1.5 → 2 (整数化、総合値適正)
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
    id: 'kni_templar',
    name: '聖堂騎士',
    type: 'creature',
    faction: 'knight',
    cost: 3,
    attack: 2,
    health: 3, // バランス調整: 2/4 → 2/3, on_play効果を削除
    keywords: ['guard'],
    effects: [],
    flavor: '神聖なる誓いに宿る、不屈の守護',
  },
  {
    id: 'kni_guardian',
    name: '守護騎士',
    type: 'creature',
    faction: 'knight',
    cost: 2,
    attack: 1,
    health: 2, // バランス調整: 1/4 → 1/2, on_death効果を削除
    keywords: ['guard'],
    effects: [],
    flavor: '我が盾に込めし祈りよ、永遠に仲間を護れ',
  },
  {
    id: 'kni_crusader',
    name: '十字軍騎士',
    type: 'creature',
    faction: 'knight',
    cost: 1,
    attack: 2, // 1.5 → 2 (整数化、効果補正-0.5考慮)
    health: 1, // 0.5 → 1 (整数化、総合値適正)
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
    id: 'kni_chaplain',
    name: '従軍僧',
    type: 'creature',
    faction: 'knight',
    cost: 1,
    attack: 1,
    health: 1, // 効果補正-1考慮で適正値維持
    keywords: [],
    effects: [
      {
        trigger: 'on_death',
        target: 'ally_all',
        action: 'heal',
        value: 2,
      },
    ],
    flavor: '最後の祈りに込める、永遠なる加護',
  },
  {
    id: 'kni_vindicator',
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
    id: 'kni_banneret',
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
    id: 'kni_sanctuary_prayer',
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
        value: 0, // プレースホルダー
      },
    ],
    flavor: '一人一人の祈りは小さくとも、共に捧げれば天に届く奇跡となる。',
  },
  {
    id: 'kni_white_wing_marshal',
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
      },
    ],
    flavor: '恐れるな、我が翼の元に集え！光は我らと共にある！',
  },
  {
    id: 'kni_galleon',
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
        value: 1, // Placeholder, value from other allies
      },
    ],
    flavor: '我が身は騎士団の礎。我が魂は仲間たちの盾。この誓いが破られることはない。',
  },
  {
    id: 'kni_vow_of_unity',
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
        condition: { subject: 'allyCount', operator: 'gte', value: 3 },
      },
      {
        trigger: 'on_play',
        target: 'ally_all',
        action: 'buff_health',
        value: 2,
        condition: { subject: 'allyCount', operator: 'gte', value: 3 },
      },
      {
        trigger: 'on_play',
        target: 'ally_all',
        action: 'buff_attack',
        value: 1,
        condition: { subject: 'allyCount', operator: 'lt', value: 3 },
      },
      {
        trigger: 'on_play',
        target: 'ally_all',
        action: 'buff_health',
        value: 1,
        condition: { subject: 'allyCount', operator: 'lt', value: 3 },
      },
    ],
    flavor: '一人一人の祈りは小さくとも、共に捧げれば天に届く奇跡となる。',
  },
];

/** 審問官カード - 弱体化と除去 */
export const inquisitorCards: Card[] = [
  {
    id: 'inq_interrogator',
    name: '尋問官',
    type: 'creature',
    faction: 'inquisitor',
    cost: 1,
    attack: 1,
    health: 1, // バランス調整: 1/2 → 1/1
    keywords: [],
    effects: [
      {
        trigger: 'on_play',
        target: 'enemy_random',
        action: 'debuff_attack',
        value: 1,
      },
    ],
    flavor: '真実を問う声に、偽りは崩れ落ちる',
  },
  {
    id: 'inq_executor',
    name: '処刑執行人',
    type: 'creature',
    faction: 'inquisitor',
    cost: 2,
    attack: 2, // バランス調整: 3/2 → 2/2
    health: 2,
    keywords: [],
    effects: [
      {
        trigger: 'on_play',
        target: 'enemy_random',
        action: 'damage',
        value: 1,
      },
    ],
    flavor: '正義の刃に宿る、冷徹なる断罪',
  },
  {
    id: 'inq_inquisitor',
    name: '大審問官',
    type: 'creature',
    faction: 'inquisitor',
    cost: 3,
    attack: 2,
    health: 3, // 効果補正-1.5考慮で適正値維持
    keywords: [],
    effects: [
      {
        trigger: 'turn_end',
        target: 'enemy_all',
        action: 'debuff_attack',
        value: 1,
      },
    ],
    flavor: '鋼鉄の拳が支える秤に、情けという錘はない',
  },
  {
    id: 'inq_torturer',
    name: '拷問技師',
    type: 'creature',
    faction: 'inquisitor',
    cost: 1,
    attack: 1,
    health: 1, // 効果補正-0.5考慮で適正値維持
    keywords: [],
    effects: [
      {
        trigger: 'on_death',
        target: 'enemy_all',
        action: 'debuff_health',
        value: 1,
      },
    ],
    flavor: '罪深き者へ贈る、永遠なる悔恨',
  },
  {
    id: 'inq_purifier',
    name: '浄化者',
    type: 'creature',
    faction: 'inquisitor',
    cost: 2,
    attack: 2, // 1.5 → 2 (整数化、効果補正-1考慮で適正値)
    health: 2,
    keywords: [],
    effects: [
      {
        trigger: 'on_play',
        target: 'enemy_all',
        action: 'debuff_health',
        value: 1,
      },
    ],
    flavor: '聖なる炎は全てを焼き尽くし、清浄を残す',
  },
  {
    id: 'inq_witch_hunter',
    name: '魔女狩人',
    type: 'creature',
    faction: 'inquisitor',
    cost: 2,
    attack: 2, // 1.5 → 2 (整数化、効果補正-0.5考慮)
    health: 2, // 1.5 → 2 (整数化、総合値適正)
    keywords: [],
    effects: [
      {
        trigger: 'turn_start',
        target: 'enemy_random',
        action: 'damage',
        value: 1,
      },
    ],
    flavor: '異端の血を追い、裁きの剣は決して止まない',
  },
  {
    id: 'inq_venomtongue',
    name: '毒牙の審問官',
    type: 'creature',
    faction: 'inquisitor',
    cost: 1,
    attack: 1,
    health: 1,
    keywords: ['poison'],
    effects: [],
    flavor: '一度刺されし真実は、魂の芯まで蝕む。',
  },
  {
    id: 'inq_writ_of_silence',
    name: '沈黙の令状',
    type: 'spell',
    faction: 'inquisitor',
    cost: 2,
    keywords: [],
    effects: [
      {
        trigger: 'on_play',
        target: 'enemy_random',
        action: 'silence',
        value: 1,
      },
    ],
    flavor: '言葉を奪われし者に、抗う術はない。',
  },
  {
    id: 'inq_verdict_of_conviction',
    name: '断罪の宣告',
    type: 'spell',
    faction: 'inquisitor',
    cost: 2,
    keywords: [],
    effects: [
      {
        trigger: 'on_play',
        target: 'enemy_random',
        action: 'stun',
        value: 1, // 1ターンの持続期間
      },
    ],
    flavor: '汝の罪は確定した。これより、沈黙の罰を執行する。',
  },
  {
    id: 'inq_truth_revealer',
    name: '真実を暴く者',
    type: 'creature',
    faction: 'inquisitor',
    cost: 3,
    attack: 2,
    health: 3,
    keywords: [],
    effects: [
      {
        trigger: 'on_play',
        target: 'self',
        action: 'destroy_deck_top',
        value: 3, // コスト3以上という閾値
      },
    ],
    flavor: '隠された切り札など、我らが正義の前では塵に同じ。',
  },
  {
    id: 'inq_truth_extractor',
    name: '真実を暴く者',
    type: 'creature',
    faction: 'inquisitor',
    cost: 3,
    attack: 2,
    health: 3,
    keywords: [],
    effects: [
      {
        trigger: 'on_play',
        target: 'enemy_random',
        action: 'hand_discard',
        value: 1,
        targetFilter: { property: 'type', value: 'spell' },
      },
    ],
    flavor: '隠された切り札など、我らが正義の前では塵に同じ。',
  },
  {
    id: 'inq_purifying_flame',
    name: '浄罪の天火',
    type: 'spell',
    faction: 'inquisitor',
    cost: 7,
    keywords: [],
    effects: [
      {
        trigger: 'on_play',
        target: 'enemy_all',
        action: 'damage',
        value: 4,
      },
      {
        trigger: 'on_play',
        target: 'ally_all',
        action: 'damage',
        value: 4,
      },
    ],
    flavor: '罪も、義も、等しく灰燼に帰す。その後にこそ、揺るぎなき秩序は再建される。',
  },
];

/** 全カードデータを勢力別にエクスポート */
export const FACTION_CARDS: Record<Faction, Card[]> = {
  necromancer: necromancerCards,
  berserker: berserkerCards,
  mage: mageCards,
  knight: knightCards,
  inquisitor: inquisitorCards,
};

/** 全カードのフラットなリスト */
export const ALL_CARDS: Card[] = [
  ...necromancerCards,
  ...berserkerCards,
  ...mageCards,
  ...knightCards,
  ...inquisitorCards,
];

/** カードIDから基本カードデータを取得 */
export function getCardById(cardId: string): Card | undefined {
  return ALL_CARDS.find(card => card.id === cardId);
}

/** 勢力のカード一覧を取得 */
export function getCardsByFaction(faction: Faction): Card[] {
  return FACTION_CARDS[faction] || [];
}

/** カード数の統計情報 */
export const CARD_STATISTICS = {
  totalCards: ALL_CARDS.length,
  cardsPerFaction: 10,
  costRange: { min: 1, max: 7 },
  averageCost: ALL_CARDS.reduce((sum, card) => sum + card.cost, 0) / ALL_CARDS.length,
  cardsWithEffects: ALL_CARDS.filter(card => card.effects.length > 0).length,
} as const;
