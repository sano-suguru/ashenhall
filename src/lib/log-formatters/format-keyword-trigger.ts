import type { GameAction, LogDisplayParts, PlayerId, Keyword } from "@/types/game";
import { getCardName, getPlayerName } from "../game-state-utils";

const KEYWORD_NAMES: Record<Keyword, string> = {
  guard: "守護",
  lifesteal: "生命奪取",
  stealth: "潜伏",
  poison: "毒",
  retaliate: "報復",
  echo: "残響",
  formation: "連携",
  rush: "速攻",
  trample: "貫通",
  untargetable: "対象不可",
};

export function formatKeywordTriggerLog(action: GameAction, playerName: string): LogDisplayParts {
  if (action.type !== 'keyword_trigger') throw new Error('Invalid action type for formatKeywordTriggerLog');

  const { keyword, sourceCardId, targetId, value } = action.data;
  const sourceName = getCardName(sourceCardId);
  const isPlayerTarget = targetId === "player1" || targetId === "player2";
  const targetName = isPlayerTarget ? getPlayerName(targetId as PlayerId) : `《${getCardName(targetId)}》`;
  const keywordName = KEYWORD_NAMES[keyword] || keyword;

  return {
    type: 'keyword_trigger',
    iconName: 'Star',
    playerName,
    message: `《${sourceName}》の${keywordName}効果 → ${targetName}`,
    details: `(${value}追加ダメージ)`,
    cardIds: [sourceCardId, targetId],
  };
}
