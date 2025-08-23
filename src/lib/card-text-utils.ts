import type { Card } from '@/types/game';

const getTargetText = (target: Card['effects'][0]['target']): string => {
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

export const getEffectText = (effect: Card['effects'][0], cardType: 'creature' | 'spell'): string => {
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

  let effectDescription = '';
  switch (effect.action) {
    case 'damage':
      effectDescription = `${getTargetText(effect.target)}に${effect.value}ダメージを与える。`;
      break;
    case 'heal':
      effectDescription = `${getTargetText(effect.target)}を${effect.value}回復する。`;
      break;
    case 'buff_attack':
      effectDescription = `${getTargetText(effect.target)}の攻撃力を+${effect.value}する。`;
      break;
    case 'buff_health':
      effectDescription = `${getTargetText(effect.target)}の体力を+${effect.value}する。`;
      break;
    case 'debuff_attack':
      effectDescription = `${getTargetText(effect.target)}の攻撃力を-${effect.value}する。`;
      break;
    case 'debuff_health':
      effectDescription = `${getTargetText(effect.target)}の体力を-${effect.value}する。`;
      break;
    case 'summon':
      effectDescription = `1/1の骸骨トークンを${effect.value}体召喚する。`;
      break;
    case 'draw_card':
      effectDescription = `カードを${effect.value}枚引く。`;
      break;
    case 'resurrect':
      effectDescription = `あなたの墓地からコスト${effect.value}以下のクリーチャーを1体戦場に戻す。`;
      break;
    case 'silence':
      effectDescription = `${getTargetText(effect.target)}を沈黙させる。`;
      break;
    case 'stun':
      effectDescription = `${getTargetText(effect.target)}を1ターンスタンさせる。`;
      break;
    case 'destroy_deck_top':
      effectDescription = `相手はデッキの上から${effect.value}枚のカードを墓地に置く。`;
      break;
    case 'swap_attack_health':
      effectDescription = `${getTargetText(effect.target)}の攻撃力と体力を入れ替える。`;
      break;
    case 'hand_discard':
      effectDescription = `相手は手札からランダムに${effect.value}枚のカードを捨てる。`;
      break;
    case 'ready':
      effectDescription = `このクリーチャーはもう一度攻撃できる。`;
      break;
    default:
        effectDescription = `[未定義アクション: ${effect.action}]`;
  }

  return `${triggerText}: ${effectDescription}`;
};
