import type { GameAction, LogDisplayParts, PlayerId, EffectAction } from "@/types/game";
import { getCardName, getPlayerName, getSourceDisplayName } from "../game-state-utils";

const EFFECT_NAMES: Record<EffectAction, string> = {
  damage: "ダメージ",
  heal: "回復",
  buff_attack: "攻撃力強化",
  buff_health: "体力強化",
  debuff_attack: "攻撃力低下",
  debuff_health: "体力低下",
  summon: "召喚",
  draw_card: "ドロー",
  resurrect: "蘇生",
  silence: "沈黙",
  guard: "守護",
  stun: "スタン",
  destroy_deck_top: "デッキ破壊",
  swap_attack_health: "攻/体入替",
  hand_discard: "手札破壊",
  destroy_all_creatures: "全体破壊",
  ready: "再攻撃可能",
  apply_brand: "烙印付与",
  banish: "消滅",
  deck_search: "デッキサーチ",
};

export function formatEffectTriggerLog(action: GameAction, playerName: string): LogDisplayParts {
  if (action.type !== 'effect_trigger') throw new Error('Invalid action type for formatEffectTriggerLog');

  const { data } = action;
  const sourceCardName = getSourceDisplayName(data.sourceCardId);

  const detailsParts = Object.entries(data.targets).map(([targetId, valueChange]) => {
    const targetName = (targetId === 'player1' || targetId === 'player2') ? getPlayerName(targetId as PlayerId) : `《${getCardName(targetId)}》`;
    const changes = [];
    if (valueChange.attack) {
      const diff = valueChange.attack.after - valueChange.attack.before;
      changes.push(`攻撃力 ${valueChange.attack.before}→${valueChange.attack.after} (${diff >= 0 ? '+' : ''}${diff})`);
    }
    if (valueChange.health) {
      const diff = valueChange.health.after - valueChange.health.before;
      changes.push(`体力 ${valueChange.health.before}→${valueChange.health.after} (${diff >= 0 ? '+' : ''}${diff})`);
    }
    if (valueChange.life) {
      const diff = valueChange.life.after - valueChange.life.before;
      changes.push(`ライフ ${valueChange.life.before}→${valueChange.life.after} (${diff >= 0 ? '+' : ''}${diff})`);
    }
    
    if (changes.length === 0) {
      const effectName = EFFECT_NAMES[data.effectType] || data.effectType;
      if (data.effectType === 'ready') {
        return `${targetName}が${effectName}になった`;
      }
      return `${targetName}に${effectName}(${data.effectValue})`;
    }
    return `${targetName} ${changes.join(', ')}`;
  });

  return {
    type: 'effect_trigger',
    iconName: 'Sparkles',
    playerName,
    message: `${sourceCardName}の効果`,
    details: detailsParts.join('; '),
    cardIds: [data.sourceCardId, ...Object.keys(data.targets)],
  };
}
