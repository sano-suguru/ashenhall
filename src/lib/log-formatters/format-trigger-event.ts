import type { GameAction, LogDisplayParts, EffectTrigger } from "@/types/game";
import { getCardName } from "../game-state-utils";

const TRIGGER_TYPE_NAMES: Record<EffectTrigger, string> = {
  on_play: 'プレイされた時',
  on_death: '死亡した時',
  turn_start: 'ターン開始時',
  turn_end: 'ターン終了時',
  passive: '常時効果',
  on_ally_death: '味方が死亡した時',
  on_damage_taken: 'ダメージを受けた時',
  on_attack: '攻撃した時',
  on_spell_play: '呪文をプレイした時',
};

export function formatTriggerEventLog(action: GameAction, playerName: string): LogDisplayParts {
  if (action.type !== 'trigger_event') throw new Error('Invalid action type for formatTriggerEventLog');

  const { triggerType, sourceCardId, targetCardId } = action.data;
  const triggerName = TRIGGER_TYPE_NAMES[triggerType] || '不明なトリガー';
  const message = targetCardId
    ? `《${getCardName(targetCardId)}》の効果が発動`
    : `効果が発動`;
  
  return {
    type: 'trigger_event',
    iconName: 'Zap',
    playerName,
    message,
    triggerText: triggerName,
    cardIds: [sourceCardId, targetCardId].filter((id): id is string => !!id),
  };
}
