import type { Faction } from '@/types/game';

export type SampleDeck = {
  name: string;
  faction: Faction;
  cardIds: string[];
  coreCardIds?: string[]; // コアカードのID配列 (オプション)
};

export const sampleDecks: SampleDeck[] = [
  // 1. 死霊術師「終わりなき収穫」
  {
    name: '終わりなき収穫',
    faction: 'necromancer',
    coreCardIds: ['necro_harvester', 'necro_librarian'],
    cardIds: [
      'necro_harvester', 'necro_harvester', 'necro_harvester',
      'necro_librarian', 'necro_librarian', 'necro_librarian',
      'necro_skeleton', 'necro_skeleton',
      'necro_ghoul', 'necro_ghoul',
      'necro_zombie', 'necro_zombie',
      'necro_necromancer', 'necro_necromancer',
      'necro_wraith', 'necro_wraith',
      'necro_grave_master',
      'necro_soul_vortex',
    ],
  },
  // 2. 戦狂い「逆境の栄光」
  {
    name: '逆境の栄光',
    faction: 'berserker',
    coreCardIds: ['ber_last_stand', 'ber_desperate_berserker'],
    cardIds: [
      'ber_last_stand', 'ber_last_stand', 'ber_last_stand',
      'ber_desperate_berserker', 'ber_desperate_berserker', 'ber_desperate_berserker',
      'ber_berserker', 'ber_berserker',
      'ber_fury', 'ber_fury',
      'ber_warrior', 'ber_warrior',
      'ber_raider', 'ber_raider',
      'ber_bomber', 'ber_bomber',
      'ber_champion',
      'ber_blood_awakening_spell',
    ],
  },
  // 3. 魔導士「星詠みの儀式」
  {
    name: '星詠みの儀式',
    faction: 'mage',
    coreCardIds: ['mag_scholar', 'mag_stargazer_sage'],
    cardIds: [
      'mag_scholar', 'mag_scholar', 'mag_scholar',
      'mag_stargazer_sage', 'mag_stargazer_sage', 'mag_stargazer_sage',
      'mag_apprentice', 'mag_apprentice',
      'mag_familiar', 'mag_familiar',
      'mag_elementalist', 'mag_elementalist',
      'mag_storm', 'mag_storm',
      'mag_torrent', 'mag_torrent',
      'mag_reality_collapse',
      'mag_arcane_lightning',
    ],
  },
  // 4. 騎士「鉄壁のファランクス」
  {
    name: '鉄壁のファランクス',
    faction: 'knight',
    coreCardIds: ['kni_squire', 'kni_vow_of_unity'],
    cardIds: [
      'kni_squire', 'kni_squire', 'kni_squire',
      'kni_vow_of_unity', 'kni_vow_of_unity', 'kni_vow_of_unity',
      'kni_crusader', 'kni_crusader',
      'kni_chaplain', 'kni_chaplain',
      'kni_paladin', 'kni_paladin',
      'kni_guardian', 'kni_guardian',
      'kni_templar', 'kni_templar',
      'kni_banneret',
      'kni_galleon',
    ],
  },
  // 5. 審問官「静寂の法廷」
  {
    name: '静寂の法廷',
    faction: 'inquisitor',
    coreCardIds: ['inq_writ_of_silence', 'inq_truth_extractor'],
    cardIds: [
      'inq_writ_of_silence', 'inq_writ_of_silence', 'inq_writ_of_silence',
      'inq_truth_extractor', 'inq_truth_extractor', 'inq_truth_extractor',
      'inq_interrogator', 'inq_interrogator',
      'inq_torturer', 'inq_torturer',
      'inq_venomtongue', 'inq_venomtongue',
      'inq_executor', 'inq_executor',
      'inq_purifier', 'inq_purifier',
      'inq_inquisitor',
      'inq_purifying_flame',
    ],
  },
];

export function getSampleDeck(faction: Faction): SampleDeck | undefined {
  return sampleDecks.find(deck => deck.faction === faction);
}
