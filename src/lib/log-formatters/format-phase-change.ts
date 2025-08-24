import type { GameAction, GameState, LogDisplayParts } from "@/types/game";
import { getPlayerName, getTurnNumberForAction } from "../game-state-utils";

const PHASE_NAMES: Record<string, string> = {
  draw: "ドロー",
  energy: "エネルギー",
  deploy: "配置",
  battle: "戦闘",
  end: "終了",
};

export function formatPhaseChangeLog(action: GameAction, playerName: string, gameState: GameState): LogDisplayParts {
  if (action.type !== 'phase_change') throw new Error('Invalid action type for formatPhaseChangeLog');

  if (action.data.toPhase === "draw") {
    const turnNumber = getTurnNumberForAction(action, gameState);
    return {
      type: 'phase_change',
      iconName: 'RotateCcw',
      playerName,
      message: `ターン${turnNumber}開始 - ${playerName}のターン`,
      cardIds: [],
    };
  }
  
  const phaseName = PHASE_NAMES[action.data.toPhase] || action.data.toPhase;
  return {
    type: 'phase_change',
    iconName: 'Flag',
    playerName,
    message: `${phaseName}フェーズ`,
    cardIds: [],
  };
}
