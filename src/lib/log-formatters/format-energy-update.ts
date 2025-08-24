import type { GameAction, LogDisplayParts } from "@/types/game";

export function formatEnergyUpdateLog(action: GameAction, playerName: string): LogDisplayParts {
  if (action.type !== 'energy_update') throw new Error('Invalid action type for formatEnergyUpdateLog');
  
  const { maxEnergyBefore, maxEnergyAfter } = action.data;
  return {
    type: 'energy_update',
    iconName: 'Zap',
    playerName,
    message: `最大エネルギー +1`,
    details: `(${maxEnergyBefore} → ${maxEnergyAfter})、全回復`,
    cardIds: [],
  };
}
