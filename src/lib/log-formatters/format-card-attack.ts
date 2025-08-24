import type { GameAction, LogDisplayParts, PlayerId } from "@/types/game";
import { getCardName, getPlayerName } from "../game-state-utils";

export function formatCardAttackLog(action: GameAction, playerName: string): LogDisplayParts {
  if (action.type !== 'card_attack') throw new Error('Invalid action type for formatCardAttackLog');

  const { data } = action;
  const attackerName = getCardName(data.attackerCardId);
  const isPlayerTarget = data.targetId === "player1" || data.targetId === "player2";
  const targetName = isPlayerTarget ? getPlayerName(data.targetId as PlayerId) : `《${getCardName(data.targetId)}》`;
  
  let details = `(${data.damage}ダメージ)`;
  if (data.targetHealth) {
    details += ` 体力 ${data.targetHealth.before}→${data.targetHealth.after}`;
  } else if (data.targetPlayerLife) {
    details += ` ライフ ${data.targetPlayerLife.before}→${data.targetPlayerLife.after}`;
  }

  return {
    type: 'card_attack',
    iconName: 'Swords',
    playerName,
    message: `《${attackerName}》 → ${targetName}`,
    details: details,
    cardIds: [data.attackerCardId, data.targetId],
  };
}
