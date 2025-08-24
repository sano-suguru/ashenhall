import React from 'react';
import type { GameState, GameAction, PlayerId } from '@/types/game';
import { getFinalGameState, getLogDisplayParts, getCardName } from '@/lib/game-state-utils';
import CardNameWithTooltip from '../CardNameWithTooltip';
import { 
  AlertCircle, Crown, Trophy, Skull, Zap, BarChart3, User, Bot,
  CreditCard, Swords, Target, Flag, TrendingUp, TrendingDown, Heart, 
  Shield, ArrowDown, Users, RotateCcw, MicOff, Repeat, Trash2, ShieldOff, Star, AlertTriangle
} from 'lucide-react';

const ICONS = {
  CreditCard, Zap, Target, Swords, Flag,
  TrendingUp, TrendingDown, Heart, Shield, ArrowDown, Users,
  RotateCcw, MicOff, AlertCircle, Skull, Repeat, Trash2, ShieldOff,
  AlertTriangle, Star,
} as const;

interface GameResultSectionProps {
  gameState: GameState;
  decisiveAction: GameAction | null;
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

export default function GameResultSection({ gameState, decisiveAction }: GameResultSectionProps) {
  if (!gameState.result) return null;

  const finalState = getFinalGameState(gameState);

  return (
    <div className="mt-8 mb-6">
      <div className="flex items-center mb-6">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
        <div className="px-4 flex items-center space-x-2">
          <AlertCircle size={20} className="text-amber-400" />
          <span className="text-xl font-bold text-amber-300">ゲーム終了</span>
          <AlertCircle size={20} className="text-amber-400" />
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
      </div>

      <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-xl border border-amber-500/30 p-6 mb-6">
        <div className="flex items-center justify-center space-x-4 mb-4">
          {gameState.result.winner ? (
            <>
              <Crown size={32} className="text-yellow-400" />
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  {gameState.result.winner === 'player1' ? 'あなた' : '相手'}の勝利
                </div>
                <div className="text-amber-300">
                  {gameState.result.reason === 'life_zero' ? 'ライフ0による勝利' : '勝利'}
                </div>
              </div>
              <Trophy size={32} className="text-yellow-400" />
            </>
          ) : (
            <>
              <Skull size={32} className="text-gray-400" />
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-300 mb-1">引き分け</div>
              </div>
              <Skull size={32} className="text-gray-400" />
            </>
          )}
        </div>

        {decisiveAction && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <Zap size={18} className="text-red-400" />
              <span className="font-bold text-red-300">決定打</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-xs font-mono text-gray-500">
                #{decisiveAction.sequence.toString().padStart(3, '0')}
              </span>
              <div className="flex-1">
                {formatAction(decisiveAction, gameState)}
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-800/50 border border-gray-600/50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <BarChart3 size={18} className="text-blue-400" />
            <span className="font-bold text-blue-300">最終状態</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <User size={16} className="text-blue-400" />
                <span className="font-semibold text-blue-300">あなた</span>
              </div>
              <div className="text-sm space-y-1 ml-6">
                <div className="flex justify-between">
                  <span className="text-gray-400">ライフ:</span>
                  <span className={`font-bold ${finalState.player1.life <= 0 ? 'text-red-400' : 'text-white'}`}>
                    {finalState.player1.life}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">場:</span>
                  <span className="text-white">{finalState.player1.fieldCards}体</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">手札:</span>
                  <span className="text-white">{finalState.player1.handCards}枚</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">デッキ:</span>
                  <span className="text-white">{finalState.player1.deckCards}枚</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Bot size={16} className="text-red-400" />
                <span className="font-semibold text-red-300">相手</span>
              </div>
              <div className="text-sm space-y-1 ml-6">
                <div className="flex justify-between">
                  <span className="text-gray-400">ライフ:</span>
                  <span className={`font-bold ${finalState.player2.life <= 0 ? 'text-red-400' : 'text-white'}`}>
                    {finalState.player2.life}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">場:</span>
                  <span className="text-white">{finalState.player2.fieldCards}体</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">手札:</span>
                  <span className="text-white">{finalState.player2.handCards}枚</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">デッキ:</span>
                  <span className="text-white">{finalState.player2.deckCards}枚</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
