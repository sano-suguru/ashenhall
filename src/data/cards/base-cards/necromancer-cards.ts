/**
 * 死霊術師カード - 墓地活用と復活効果
 * 
 * 設計方針:
 * - 墓地を活用した長期的な戦略
 * - 復活と召喚による盤面優位
 * - 相手の攻撃力を削ぐ弱体化効果
 */

import type { CardTemplate } from '@/types/cards';

/** 死霊術師カード - 墓地活用と復活効果 */
export const necromancerCards: CardTemplate[] = [
  {
    templateId: 'necro_skeleton',
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
    templateId: 'necro_zombie',
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
    templateId: 'necro_wraith',
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
    templateId: 'necro_necromancer',
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
    templateId: 'necro_lich',
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
    templateId: 'necro_ghoul',
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
    templateId: 'necro_harvester',
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
    templateId: 'necro_grave_master',
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
    templateId: 'necro_soul_offering',
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
    templateId: 'necro_grave_giant',
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
        value: 1,
        dynamicValue: { source: 'graveyard', filter: 'creatures' },
      },
    ],
    flavor: '古の王たちの眠りを守るため、彼は死者の力をその身に宿す。',
  },
  {
    templateId: 'necro_librarian',
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
        value: 1,
        activationCondition: { subject: 'graveyard', operator: 'gte', value: 4 },
      },
      {
        trigger: 'on_play',
        target: 'self',
        action: 'draw_card',
        value: 1,
        activationCondition: { subject: 'graveyard', operator: 'gte', value: 8 },
      },
    ],
    flavor: '死者の声が囁く古き知恵。静寂の奥深くに、力の源泉が眠っている。',
  },
  {
    templateId: 'necro_soul_vortex',
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
        value: 1,
        dynamicValue: { source: 'graveyard', filter: 'exclude_self' },
      },
    ],
    flavor: '無数の終焉を束ね、唯一つの絶対的な始まりを告げる。',
  },
];
