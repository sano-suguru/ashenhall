/**
 * 詳細戦闘ログモーダル - 全アクションログの表示と分析
 * 
 * 設計方針:
 * - 全actionLogの制限なし表示
 * - ターン別グルーピング
 * - 巻き戻し機能との連携
 * - アクションタイプ別のフィルタリング
 */

'use client';

import React from 'react';
import type { GameState, GameAction } from '@/types/game';
import { useBattleLog } from '@/hooks/useBattleLog';
// 旧battle-log/ディレクトリのコンポーネントを内部統合
import type { PlayerId } from '@/types/game';
import { getLogDisplayParts, getCardName, getFinalGameState, INTERNAL_LOG_TYPES } from '@/lib/game-state-utils';
import CardNameWithTooltip from './CardNameWithTooltip';
import { 
  X, Copy, Check, Search,
  Zap, User, Bot, AlertTriangle, CreditCard, Swords, Target, Flag,
  TrendingUp, TrendingDown, Heart, Shield, ArrowDown, Users, RotateCcw,
  MicOff, AlertCircle, Skull, Repeat, Trash2, ShieldOff, Star,
  Crown, Trophy, BarChart3
} from 'lucide-react';

interface BattleLogModalProps {
  gameState: GameState;
  isOpen: boolean;
  onClose: () => void;
  onJumpToAction?: (sequence: number) => void;
}

// === 内部コンポーネント定義（旧battle-log/ディレクトリから統合） ===

const ICONS = {
  CreditCard, Zap, Target, Swords, Flag,
  TrendingUp, TrendingDown, Heart, Shield, ArrowDown, Users,
  RotateCcw, MicOff, AlertCircle, Skull, Repeat, Trash2, ShieldOff,
  AlertTriangle, Star,
} as const;

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

/**
 * BattleLogHeader - ヘッダー部分
 */
const BattleLogHeader = ({ onClose, copySuccess, onCopy, isFiltered }: {
  onClose: () => void;
  copySuccess: boolean;
  onCopy: (useFiltered: boolean) => void;
  isFiltered: boolean;
}) => {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold text-white">詳細戦闘ログ</h2>
      <div className="flex items-center space-x-3">
        <button
          onClick={() => onCopy(false)}
          className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition-colors"
          title="全ログをクリップボードにコピー"
        >
          {copySuccess ? (
            <>
              <Check size={16} />
              <span>コピー完了</span>
            </>
          ) : (
            <>
              <Copy size={16} />
              <span>全ログコピー</span>
            </>
          )}
        </button>
        
        {isFiltered && (
          <button
            onClick={() => onCopy(true)}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
            title="フィルター適用済みログをクリップボードにコピー"
          >
            <Copy size={16} />
            <span>表示中のみ</span>
          </button>
        )}
        
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X size={20} className="text-gray-400" />
        </button>
      </div>
    </div>
  );
};

/**
 * BattleLogControls - コントロール部分
 */
const BattleLogControls = ({ searchTerm, filterType, filterPlayer, onSearchChange, onFilterTypeChange, onFilterPlayerChange }: {
  searchTerm: string;
  filterType: string;
  filterPlayer: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFilterTypeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onFilterPlayerChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="アクション検索..."
          value={searchTerm}
          onChange={onSearchChange}
          className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none"
        />
      </div>
      
      <select
        value={filterType}
        onChange={onFilterTypeChange}
        className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-400 focus:outline-none"
      >
        <option value="all">全アクション</option>
        <option value="card_play">カード配置</option>
        <option value="card_attack">攻撃</option>
        <option value="effect_trigger">効果発動</option>
        <option value="keyword_trigger">キーワード発動</option>
        <option value="phase_change">フェーズ変更</option>
        <option value="energy_update">エネルギー更新</option>
        <option value="trigger_event">トリガーイベント</option>
        <option value="creature_destroyed">クリーチャー破壊</option>
      </select>
      
      <select
        value={filterPlayer}
        onChange={onFilterPlayerChange}
        className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-400 focus:outline-none"
      >
        <option value="all">全プレイヤー</option>
        <option value="player1">あなた</option>
        <option value="player2">相手</option>
      </select>
    </div>
  );
};

/**
 * BattleLogStats - 統計部分
 */
const BattleLogStats = ({ totalActions, filteredCount, currentTurn }: {
  totalActions: number;
  filteredCount: number;
  currentTurn: number;
}) => {
  return (
    <div className="mt-4 flex items-center space-x-6 text-sm text-gray-400">
      <span>
        総アクション: <span className="text-white font-bold">{totalActions}</span>
      </span>
      <span>
        表示中: <span className="text-white font-bold">{filteredCount}</span>
      </span>
      <span>
        現在ターン: <span className="text-white font-bold">{currentTurn}</span>
      </span>
    </div>
  );
};

/**
 * ActionList - アクションリスト部分
 */
const ActionList = ({ groupedActions, gameState, decisiveAction, onJumpToAction }: {
  groupedActions: Record<number, GameAction[]>;
  gameState: GameState;
  decisiveAction: GameAction | null;
  onJumpToAction?: (sequence: number) => void;
}) => {
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
};

/**
 * GameResultSection - ゲーム結果部分
 */
const GameResultSection = ({ gameState, decisiveAction }: {
  gameState: GameState;
  decisiveAction: GameAction | null;
}) => {
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
};

// === メインコンポーネント ===

export default function BattleLogModal({ 
  gameState, 
  isOpen, 
  onClose, 
  onJumpToAction 
}: BattleLogModalProps) {
  const {
    searchTerm,
    filterType,
    filterPlayer,
    copySuccess,
    filteredActions,
    groupedActions,
    decisiveAction,
    handleSearchTermChange,
    handleFilterTypeChange,
    handleFilterPlayerChange,
    copyToClipboard,
  } = useBattleLog(gameState);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="p-6 border-b border-gray-700">
          <BattleLogHeader
            onClose={onClose}
            copySuccess={copySuccess}
            onCopy={copyToClipboard}
            isFiltered={filteredActions.length < gameState.actionLog.length}
          />
          <BattleLogControls
            searchTerm={searchTerm}
            filterType={filterType}
            filterPlayer={filterPlayer}
            onSearchChange={handleSearchTermChange}
            onFilterTypeChange={handleFilterTypeChange}
            onFilterPlayerChange={handleFilterPlayerChange}
          />
          <BattleLogStats
            totalActions={gameState.actionLog.length}
            filteredCount={filteredActions.length}
            currentTurn={gameState.turnNumber}
          />
        </div>

        {/* アクションリスト */}
        <div className="flex-1 overflow-y-auto p-6">
          <ActionList
            groupedActions={groupedActions}
            gameState={gameState}
            decisiveAction={decisiveAction}
            onJumpToAction={onJumpToAction}
          />
          <GameResultSection
            gameState={gameState}
            decisiveAction={decisiveAction}
          />
        </div>

        {/* フッター */}
        <div className="p-4 border-t border-gray-700 bg-gray-900/50">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div>
              {gameState.result ? (
                <span>
                  ゲーム終了: <span className="text-white">{gameState.result.reason === 'life_zero' ? 'ライフ0' : '時間切れ'}</span>
                </span>
              ) : (
                <span>ゲーム進行中</span>
              )}
            </div>
            <div>
              経過時間: <span className="text-white">{Math.floor((Date.now() - gameState.startTime) / 1000)}秒</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
