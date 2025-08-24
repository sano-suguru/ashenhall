import React from 'react';
import type { GameState, GameAction, PlayerId } from '@/types/game';
import { getLogDisplayParts, getCardName } from '@/lib/game-state-utils';
import CardNameWithTooltip from '../CardNameWithTooltip';
import { 
  Zap, User, Bot, AlertTriangle, CreditCard, Swords, Target, Flag,
  TrendingUp, TrendingDown, Heart, Shield, ArrowDown, Users, RotateCcw,
  MicOff, AlertCircle, Skull, Repeat, Trash2, ShieldOff, Star
} from 'lucide-react';

const ICONS = {
  CreditCard, Zap, Target, Swords, Flag,
  TrendingUp, TrendingDown, Heart, Shield, ArrowDown, Users,
  RotateCcw, MicOff, AlertCircle, Skull, Repeat, Trash2, ShieldOff,
  AlertTriangle, Star,
} as const;

interface ActionListProps {
  groupedActions: Record<number, GameAction[]>;
  gameState: GameState;
  decisiveAction: GameAction | null;
  onJumpToAction?: (sequence: number) => void;
}

function getPlayerIcon(playerId: PlayerId) {
  return playerId === 'player1' ? User : Bot;
}

function formatAction(action: GameAction, gameState: GameState): React.ReactElement {
  const parts = getLogDisplayParts(action, gameState);
  const PlayerIcon = getPlayerIcon(action.playerId);
  const IconComponent = ICONS[parts.iconName as keyof typeof ICONS] || AlertTriangle;

  const messageWithTooltips = parts.message.split(/(《.*?》)/g).map((segment, index) => {
    if (segment.startsWith('《') && segment.endsWith('》')) {
      const cardName = segment.substring(1, segment.length - 1);
      const cardId = parts.cardIds.find(id => getCardName(id) === cardName);
      if (cardId) {
        return (
          <CardNameWithTooltip key={index} cardId={cardId} showBrackets={true}>
            {cardName}
          </CardNameWithTooltip>
        );
      }
    }
    return segment;
  });

  return (
    <div className="flex items-center space-x-2">
      <PlayerIcon size={14} className={action.playerId === 'player1' ? 'text-blue-400' : 'text-red-400'} />
      <IconComponent size={14} />
      <span>
        <span className="font-semibold">[{parts.playerName}]</span> {messageWithTooltips}
        {parts.details && <span className="text-gray-400 ml-1">{parts.details}</span>}
        {parts.triggerText && <span className="text-gray-400 ml-1">({parts.triggerText})</span>}
      </span>
    </div>
  );
}

export default function ActionList({
  groupedActions,
  gameState,
  decisiveAction,
  onJumpToAction,
}: ActionListProps) {
  if (Object.keys(groupedActions).length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        条件に一致するアクションがありません
      </div>
    );
  }

  return (
    <>
      {Object.entries(groupedActions)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([turnNumber, actions]) => (
          <div key={turnNumber} className="mb-6">
            <div className="sticky top-0 bg-gray-900/90 backdrop-blur-sm py-2 mb-3 border-b border-gray-700">
              <h3 className="text-lg font-bold text-amber-300">
                ターン {turnNumber}
              </h3>
            </div>
            
            <div className="space-y-2">
              {actions.map((action) => {
                const isDecisiveAction = decisiveAction && action.sequence === decisiveAction.sequence;
                return (
                  <div
                    key={action.sequence}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      isDecisiveAction 
                        ? 'bg-red-900/30 border-red-500/50 hover:bg-red-900/40' 
                        : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-800/70'
                    }`}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <span className="text-xs font-mono text-gray-500 min-w-[3rem]">
                        #{action.sequence.toString().padStart(3, '0')}
                      </span>
                      <div className="flex items-center space-x-2 flex-1">
                        {isDecisiveAction && (
                          <div title="決定打">
                            <Zap size={16} className="text-red-400 animate-pulse" />
                          </div>
                        )}
                        <div className="flex-1">
                          {formatAction(action, gameState)}
                        </div>
                      </div>
                    </div>
                    
                    {onJumpToAction && (
                      <button
                        onClick={() => onJumpToAction(action.sequence)}
                        className="ml-3 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors"
                        title="この時点に戻る"
                      >
                        戻る
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
    </>
  );
}
