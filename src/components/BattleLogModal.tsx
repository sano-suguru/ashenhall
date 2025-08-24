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
import type { GameState } from '@/types/game';
import { useBattleLog } from '@/hooks/useBattleLog';
import BattleLogHeader from './battle-log/BattleLogHeader';
import BattleLogControls from './battle-log/BattleLogControls';
import BattleLogStats from './battle-log/BattleLogStats';
import ActionList from './battle-log/ActionList';
import GameResultSection from './battle-log/GameResultSection';

interface BattleLogModalProps {
  gameState: GameState;
  isOpen: boolean;
  onClose: () => void;
  onJumpToAction?: (sequence: number) => void;
}

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
