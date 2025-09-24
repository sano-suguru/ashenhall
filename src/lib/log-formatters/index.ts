import type { GameAction, GameState, LogDisplayParts } from "@/types/game";
import { formatCardAttackLog } from './format-card-attack';
import { formatCardPlayLog } from './format-card-play';
import { formatCreatureDestroyedLog } from './format-creature-destroyed';
import { formatEffectTriggerLog } from './format-effect-trigger';
import { formatEnergyUpdateLog } from './format-energy-update';
import { formatKeywordTriggerLog } from './format-keyword-trigger';
import { formatPhaseChangeLog } from './format-phase-change';
import { formatTriggerEventLog } from './format-trigger-event';
// 仮フォーマッタ（詳細仕様未定のため簡易）
const formatCardDrawLog: LogFormatter = (action, playerName) => {
  if (action.type !== 'card_draw') throw new Error('invalid type');
  return {
    type: 'card_draw',
    iconName: 'FilePlus',
    playerName,
    message: `カードをドロー (${action.data.handSizeBefore}->${action.data.handSizeAfter})`,
    details: action.data.fatigue ? `疲労:${action.data.fatigue.lifeBefore}->${action.data.fatigue.lifeAfter}` : undefined,
    cardIds: [action.data.cardId]
  };
};
const formatEnergyRefillLog: LogFormatter = (action, playerName) => {
  if (action.type !== 'energy_refill') throw new Error('invalid type');
  return {
    type: 'energy_refill',
    iconName: 'BatteryCharging',
    playerName,
    message: `エネルギー回復 ${action.data.energyBefore}->${action.data.energyAfter}`,
    details: `最大:${action.data.maxEnergy}`,
    cardIds: []
  };
};
const formatEndStageLog: LogFormatter = (action, playerName) => {
  if (action.type !== 'end_stage') throw new Error('invalid type');
  return {
    type: 'end_stage',
    iconName: 'Clock',
    playerName,
    message: `EndStage:${action.data.stage}`,
    cardIds: []
  };
};
// combat_stage 用の簡易フォーマッタ（暫定: UI は主に card_attack / creature_destroyed を詳細表示）
const formatCombatStageLog: LogFormatter = (action, playerName) => {
  if (action.type !== 'combat_stage') throw new Error('Invalid action type for combat_stage formatter');
  const stage = action.data.stage;
  const attacker = action.data.attackerId;
  const target = action.data.targetId ?? 'player';
  return {
    type: 'combat_stage',
    iconName: 'Swords',
    playerName,
    message: `[${stage}] ${attacker} -> ${target}`,
    cardIds: [attacker, ...(action.data.targetId ? [action.data.targetId] : [])]
  };
};

type LogFormatter = (action: GameAction, playerName: string, gameState: GameState) => LogDisplayParts;

export const logFormatters: Record<GameAction['type'], LogFormatter> = {
  energy_update: formatEnergyUpdateLog,
  card_play: formatCardPlayLog,
  card_attack: formatCardAttackLog,
  creature_destroyed: formatCreatureDestroyedLog,
  effect_trigger: formatEffectTriggerLog,
  phase_change: formatPhaseChangeLog,
  trigger_event: formatTriggerEventLog,
  keyword_trigger: formatKeywordTriggerLog,
  combat_stage: formatCombatStageLog,
  card_draw: formatCardDrawLog,
  energy_refill: formatEnergyRefillLog,
  end_stage: formatEndStageLog,
};
