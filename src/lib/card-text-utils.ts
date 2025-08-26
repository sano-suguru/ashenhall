import type { Card, CardEffect, EffectAction } from '@/types/game';

const getTargetText = (target: CardEffect['target']): string => {
  const targetMap: { [key: string]: string } = {
    self: '自身',
    ally_all: '味方全体',
    enemy_all: '敵全体',
    ally_random: 'ランダムな味方1体',
    enemy_random: 'ランダムな敵1体',
    player: '相手プレイヤー',
  };
  return targetMap[target] || '';
};

const actionTextGenerator: Record<EffectAction, (effect: CardEffect) => string> = {
  damage: (e) => `${getTargetText(e.target)}に${e.value}ダメージを与える。`,
  heal: (e) => `${getTargetText(e.target)}を${e.value}回復する。`,
  buff_attack: (e) => `${getTargetText(e.target)}の攻撃力を+${e.value}する。`,
  buff_health: (e) => `${getTargetText(e.target)}の体力を+${e.value}する。`,
  debuff_attack: (e) => `${getTargetText(e.target)}の攻撃力を-${e.value}する。`,
  debuff_health: (e) => `${getTargetText(e.target)}の体力を-${e.value}する。`,
  summon: (e) => `1/1の骸骨トークンを${e.value}体召喚する。`,
  draw_card: (e) => `カードを${e.value}枚引く。`,
  resurrect: (e) => `あなたの墓地からコスト${e.value}以下のクリーチャーを1体戦場に戻す。`,
  silence: (e) => `${getTargetText(e.target)}を沈黙させる。`,
  stun: (e) => `${getTargetText(e.target)}は、次のターン攻撃できない。`,
  destroy_deck_top: (e) => `相手はデッキの上から${e.value}枚のカードを墓地に置く。`,
  swap_attack_health: (e) => `${getTargetText(e.target)}の攻撃力と体力を入れ替える。`,
  hand_discard: (e) => `相手は手札からランダムに${e.value}枚のカードを捨てる。`,
  ready: () => `このターン、もう一度だけ攻撃できる。`,
  guard: (e) => `${getTargetText(e.target)}に守護を付与する。`,
  destroy_all_creatures: () => '全てのクリーチャーを破壊する。',
  apply_brand: (e) => `${getTargetText(e.target)}に烙印を刻む。`,
  banish: (e) => `${getTargetText(e.target)}を消滅させる。`,
  deck_search: (e) => `デッキから条件に合うカードを1枚手札に加える。`,
};

export const getEffectText = (effect: CardEffect, cardType: 'creature' | 'spell'): string => {
  const triggerMap: { [key: string]: string } = {
    on_play: cardType === 'creature' ? '召喚時' : '使用時',
    on_death: '死亡時',
    turn_start: 'ターン開始時',
    turn_end: 'ターン終了時',
    passive: '常時',
    on_spell_play: 'あなたが呪文を使用した後',
    on_ally_death: '味方のクリーチャーが死亡するたび',
    on_damage_taken: 'このクリーチャーがダメージを受けた時',
    on_attack: 'このクリーチャーが攻撃する時',
  };

  const triggerText = triggerMap[effect.trigger] || `[未定義トリガー: ${effect.trigger}]`;

  const generator = actionTextGenerator[effect.action];
  const effectDescription = generator
    ? generator(effect)
    : `[未定義アクション: ${effect.action}]`;

  return `${triggerText}: ${effectDescription}`;
};

export const KEYWORD_DEFINITIONS: Record<string, { name: string; description: string }> = {
  guard: { name: '守護', description: 'このクリーチャーがいる限り、他の味方は攻撃されない' },
  lifesteal: { name: '生命奪取', description: '与えたダメージ分プレイヤーを回復' },
  stealth: { name: '潜伏', description: '1ターンの間、対象にならない' },
  poison: { name: '毒', description: 'ダメージを与えた敵に継続ダメージを与える' },
  retaliate: { name: '反撃', description: '攻撃された時に半分のダメージで反撃する' },
  echo: { name: '残響', description: 'あなたの墓地にあるカード枚数を参照する' },
  formation: { name: '連携', description: 'あなたの場にいる味方クリーチャーの数を参照する' },
  rush: { name: '速攻', description: '召喚されたターンに攻撃できる' },
  trample: { name: '貫通', description: 'ブロックしたクリーチャーの体力を超えたダメージを敵プレイヤーに与える' },
  untargetable: { name: '対象不可', description: '相手のスペルや効果の対象にならない' },
};
