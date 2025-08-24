import type { GameAction, GameState, LogDisplayParts } from "@/types/game";
import { formatCardAttackLog } from './format-card-attack';
import { formatCardPlayLog } from './format-card-play';
import { formatCreatureDestroyedLog } from './format-creature-destroyed';
import { formatEffectTriggerLog } from './format-effect-trigger';
import { formatEnergyUpdateLog } from './format-energy-update';
import { formatKeywordTriggerLog } from './format-keyword-trigger';
import { formatPhaseChangeLog } from './format-phase-change';
import { formatTriggerEventLog } from './format-trigger-event';

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
};
