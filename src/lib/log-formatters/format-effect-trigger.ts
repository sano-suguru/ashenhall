import type { GameAction, LogDisplayParts, PlayerId, EffectAction, ValueChange, EffectTriggerActionData } from "@/types/game";
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

/**
 * ターゲットの表示名を解決する
 */
function resolveTargetName(targetId: string): string {
  return (targetId === 'player1' || targetId === 'player2') 
    ? getPlayerName(targetId as PlayerId) 
    : `《${getCardName(targetId)}》`;
}

/**
 * 値変更を文字列配列にフォーマットする
 */
function formatValueChanges(valueChange: ValueChange): string[] {
  const changes: string[] = [];
  
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
  
  if (valueChange.energy) {
    const diff = valueChange.energy.after - valueChange.energy.before;
    changes.push(`エネルギー ${valueChange.energy.before}→${valueChange.energy.after} (${diff >= 0 ? '+' : ''}${diff})`);
  }
  
  return changes;
}

/**
 * 値変更がない場合の効果説明を生成する
 */
function formatEffectDescription(targetName: string, effectType: EffectAction, effectValue: number): string {
  const effectName = EFFECT_NAMES[effectType] || effectType;
  
  if (effectType === 'ready') {
    return `${targetName}が${effectName}になった`;
  }
  
  return `${targetName}に${effectName}(${effectValue})`;
}

/**
 * 単一ターゲットの効果をフォーマットする
 */
function formatSingleTargetEffect(targetId: string, valueChange: ValueChange, data: EffectTriggerActionData): string {
  const targetName = resolveTargetName(targetId);
  const changes = formatValueChanges(valueChange);
  
  if (changes.length === 0) {
    return formatEffectDescription(targetName, data.effectType, data.effectValue);
  }
  
  return `${targetName} ${changes.join(', ')}`;
}

export function formatEffectTriggerLog(action: GameAction, playerName: string): LogDisplayParts {
  if (action.type !== 'effect_trigger') throw new Error('Invalid action type for formatEffectTriggerLog');

  const { data } = action;
  const sourceCardName = getSourceDisplayName(data.sourceCardId);

  const detailsParts = Object.entries(data.targets).map(([targetId, valueChange]) =>
    formatSingleTargetEffect(targetId, valueChange, data)
  );

  return {
    type: 'effect_trigger',
    iconName: 'Sparkles',
    playerName,
    message: `${sourceCardName}の効果`,
    details: detailsParts.join('; '),
    cardIds: [data.sourceCardId, ...Object.keys(data.targets)],
  };
}
