'use client';

import React from 'react';
import type { GameState, GameAction } from '@/types/game';
import { getLogDisplayParts } from '@/lib/game-state-utils';
import { getCardById } from '@/data/cards/base-cards';
import CardNameWithTooltip from '../CardNameWithTooltip';
import { 
  CreditCard, Zap, Target, Swords, Flag,
  TrendingUp, TrendingDown, Heart, Shield, ArrowDown, Users, Sparkles,
  RotateCcw, MicOff, AlertCircle, Skull, Repeat, Trash2, ShieldOff,
  AlertTriangle, Star,
} from 'lucide-react';

const ICONS = {
  CreditCard, Zap, Target, Swords, Flag,
  TrendingUp, TrendingDown, Heart, Shield, ArrowDown, Users, Sparkles,
  RotateCcw, MicOff, AlertCircle, Skull, Repeat, Trash2, ShieldOff,
  AlertTriangle, Star,
} as const;

function formatAction(action: GameAction, gameState: GameState): React.ReactElement {
  const parts = getLogDisplayParts(action, gameState);
  const IconComponent = ICONS[parts.iconName as keyof typeof ICONS] || AlertTriangle;

  const messageWithTooltips = parts.message.split(/(《.*?》)/g).map((segment, index) => {
    if (segment.startsWith('《') && segment.endsWith('》')) {
      const cardName = segment.substring(1, segment.length - 1);
      const cardId = parts.cardIds.find(id => getCardById(id)?.name === cardName);
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
    <span className="flex items-center space-x-1.5">
      <IconComponent size={14} />
      <span>
        <span className="font-semibold">[{parts.playerName}]</span> {messageWithTooltips}
        {parts.details && <span className="text-gray-400 ml-1">{parts.details}</span>}
      </span>
    </span>
  );
}

interface RecentLogProps {
  actions: GameAction[];
  gameState: GameState;
}

const RecentLog: React.FC<RecentLogProps> = ({ actions, gameState }) => {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 max-h-40 overflow-y-auto">
      <h3 className="text-lg font-bold mb-2">戦闘ログ</h3>
      <div className="space-y-1 text-sm">
        {actions.length === 0 ? (
          <div className="text-gray-500">ログがありません</div>
        ) : (
          actions.map((action) => (
            <div key={action.sequence} className="text-gray-300 flex items-center space-x-2">
              <span className="text-xs font-mono text-gray-500">#{action.sequence.toString().padStart(3, '0')}</span>
              {formatAction(action, gameState)}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RecentLog;
