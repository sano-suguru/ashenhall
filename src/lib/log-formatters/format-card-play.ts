import type { GameAction, LogDisplayParts } from "@/types/game";
import { getCardById } from "@/data/cards/base-cards";

export function formatCardPlayLog(action: GameAction, playerName: string): LogDisplayParts {
  if (action.type !== 'card_play') throw new Error('Invalid action type for formatCardPlayLog');

  const card = getCardById(action.data.cardId);
  return {
    type: 'card_play',
    iconName: 'CreditCard',
    playerName,
    message: `《${card?.name || action.data.cardId}》を配置`,
    details: `(コスト${card?.cost || "?"})`,
    cardIds: [action.data.cardId],
  };
}
