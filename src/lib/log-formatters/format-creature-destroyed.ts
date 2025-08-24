import type { GameAction, LogDisplayParts } from "@/types/game";
import { getCardName, getSourceDisplayName } from "../game-state-utils";

export function formatCreatureDestroyedLog(action: GameAction, playerName: string): LogDisplayParts {
  if (action.type !== 'creature_destroyed') throw new Error('Invalid action type for formatCreatureDestroyedLog');

  const { destroyedCardId, source, sourceCardId } = action.data;
  let sourceText = "";
  if (source === 'combat') sourceText = "戦闘";
  else if (source === 'effect' && sourceCardId) sourceText = `${getSourceDisplayName(sourceCardId)}の効果`;
  
  return {
    type: 'creature_destroyed',
    iconName: 'ShieldOff',
    playerName,
    message: `《${getCardName(destroyedCardId)}》破壊`,
    details: `(${sourceText}により)`,
    cardIds: [destroyedCardId],
  };
}
