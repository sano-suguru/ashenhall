'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { GameState, GameAction } from '@/types/game';
import { loadStats, saveStats, updateStatsWithGameResult } from '@/lib/stats-utils';
import { GAME_CONSTANTS } from '@/types/game';
import BattleLogModal from './BattleLogModal';
import { reconstructStateAtSequence, getTurnNumberForAction } from '@/lib/game-state-utils';
import GameHeader from './game-board/GameHeader';
import PlayerArea from './game-board/PlayerArea';
import RecentLog from './game-board/RecentLog';
import GameSidebar from './game-board/GameSidebar';

interface GameBoardProps {
  gameState: GameState;
  onReturnToSetup: () => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTurn: number;
  setCurrentTurn: (turn: number) => void;
  gameSpeed: number;
  setGameSpeed: (speed: number) => void;
}

// 攻撃シーケンス状態の型定義
interface AttackSequenceState {
  isShowingAttackSequence: boolean;
  currentAttackIndex: number;
  attackActions: GameAction[];
}

export default function GameBoard({ 
  gameState, 
  onReturnToSetup, 
  isPlaying,
  setIsPlaying,
  currentTurn,
  setCurrentTurn,
  gameSpeed,
  setGameSpeed
}: GameBoardProps) {
  const [showLog, setShowLog] = useState(false);
  const [showDetailedLog, setShowDetailedLog] = useState(false);
  
  // 攻撃シーケンス状態
  const [attackSequenceState, setAttackSequenceState] = useState<AttackSequenceState>({
    isShowingAttackSequence: false,
    currentAttackIndex: 0,
    attackActions: []
  });

  const calculateSequenceForTurn = (gs: GameState, targetTurn: number): number => {
    if (targetTurn <= 1) return 0;
    if (targetTurn > gs.turnNumber) return gs.actionLog[gs.actionLog.length - 1]?.sequence ?? 0;

    const drawPhaseStarts = gs.actionLog.filter(
      a => a.type === 'phase_change' && a.data.toPhase === 'draw'
    );

    // targetTurn is 1-based. The (targetTurn-1)-th element is the start of targetTurn.
    const startOfTurnAction = drawPhaseStarts[targetTurn - 1];

    if (startOfTurnAction) {
      return startOfTurnAction.sequence > 0 ? startOfTurnAction.sequence - 1 : 0;
    }

    return gs.actionLog[gs.actionLog.length - 1]?.sequence ?? 0;
  };
  
  const displayState = useMemo(() => {
    if (currentTurn === -1 || currentTurn >= gameState.turnNumber) {
      return gameState;
    }
    const targetSequence = calculateSequenceForTurn(gameState, currentTurn);
    return reconstructStateAtSequence(gameState, targetSequence);
  }, [gameState, currentTurn]);

  const currentEnergyLimit = Math.min(displayState.turnNumber, GAME_CONSTANTS.ENERGY_LIMIT);
  const recentActions = displayState.actionLog.slice(-10).reverse();

  const calculateTurnFromSequence = (gs: GameState, targetSequence: number): number => {
    if (targetSequence <= 0) return 1;
    let turnNumber = 1;
    for (const action of gs.actionLog) {
      if (action.sequence > targetSequence) break;
      if (action.type === 'phase_change' && action.data.toPhase === 'draw' && action.sequence > 0) {
        turnNumber++;
      }
    }
    return turnNumber;
  };

  const handleJumpToAction = (sequence: number) => {
    const targetTurn = calculateTurnFromSequence(gameState, sequence);
    setCurrentTurn(targetTurn);
    setIsPlaying(false);
    setShowDetailedLog(false);
  };

  // 指定ターンの攻撃アクションを抽出
  const getAttackActionsForTurn = (gs: GameState, targetTurn: number): GameAction[] => {
    return gs.actionLog.filter(action => {
      if (action.type !== 'card_attack') return false;
      const actionTurn = getTurnNumberForAction(action, gs);
      return actionTurn === targetTurn;
    });
  };

  // 攻撃シーケンスが完了したかチェック
  const isAttackSequenceComplete = (): boolean => {
    return attackSequenceState.currentAttackIndex >= attackSequenceState.attackActions.length;
  };

  // 現在表示中の攻撃アクションを取得
  const getCurrentAttackAction = (): GameAction | null => {
    if (!attackSequenceState.isShowingAttackSequence) return null;
    if (attackSequenceState.currentAttackIndex >= attackSequenceState.attackActions.length) return null;
    return attackSequenceState.attackActions[attackSequenceState.currentAttackIndex] || null;
  };

  const currentAttackAction = getCurrentAttackAction();

  // 攻撃シーケンス開始の検出（表示のみ、ゲーム進行には介入しない）
  useEffect(() => {
    // 最新ターン表示かつ再生中の場合のみ攻撃演出を実行
    if (isPlaying && (currentTurn === -1 || currentTurn >= gameState.turnNumber)) {
      const attackActions = getAttackActionsForTurn(gameState, gameState.turnNumber);
      
      if (attackActions.length > 0 && !attackSequenceState.isShowingAttackSequence) {
        // 攻撃アクションがある場合は攻撃シーケンス開始（表示のみ）
        setAttackSequenceState({
          isShowingAttackSequence: true,
          currentAttackIndex: 0,
          attackActions: attackActions
        });
      }
    }
  }, [gameState.turnNumber, gameState.actionLog.length, isPlaying, currentTurn]);

  // 攻撃シーケンス進行の制御（表示のみ）
  useEffect(() => {
    if (attackSequenceState.isShowingAttackSequence) {
      if (isAttackSequenceComplete()) {
        // 攻撃シーケンス完了（表示終了のみ）
        setAttackSequenceState({
          isShowingAttackSequence: false,
          currentAttackIndex: 0,
          attackActions: []
        });
      } else {
        // 次の攻撃アクションを表示
        const timer = setTimeout(() => {
          setAttackSequenceState(prev => ({
            ...prev,
            currentAttackIndex: prev.currentAttackIndex + 1
          }));
        }, 800 / gameSpeed);

        return () => clearTimeout(timer);
      }
    }
  }, [attackSequenceState.currentAttackIndex, attackSequenceState.isShowingAttackSequence, gameSpeed]);

  useEffect(() => {
    if (gameState.result) {
      const currentStats = loadStats();
      const updatedStats = updateStatsWithGameResult(currentStats, gameState);
      saveStats(updatedStats);
    }
  }, [gameState]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <GameHeader
        turnNumber={displayState.turnNumber}
        phase={displayState.phase}
        currentPlayerId={displayState.currentPlayer}
        isLogVisible={showLog}
        onReturnToSetup={onReturnToSetup}
        onToggleLog={() => setShowLog(!showLog)}
      />

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-120px)]">
          
          <div className="lg:col-span-3 flex flex-col space-y-4">
            <PlayerArea 
              player={displayState.players.player2} 
              energyLimit={currentEnergyLimit} 
              isOpponent={true}
              currentAttackAction={currentAttackAction}
            />
            {showLog && <RecentLog actions={recentActions} gameState={gameState} />}
            <PlayerArea 
              player={displayState.players.player1} 
              energyLimit={currentEnergyLimit} 
              isOpponent={false}
              currentAttackAction={currentAttackAction}
            />
          </div>

          <GameSidebar
            gameState={gameState}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            currentTurn={currentTurn}
            setCurrentTurn={setCurrentTurn}
            gameSpeed={gameSpeed}
            setGameSpeed={setGameSpeed}
            onShowDetailedLog={() => setShowDetailedLog(true)}
            onReturnToSetup={onReturnToSetup}
          />
        </div>
      </div>

      <BattleLogModal
        gameState={gameState}
        isOpen={showDetailedLog}
        onClose={() => setShowDetailedLog(false)}
        onJumpToAction={handleJumpToAction}
      />
    </div>
  );
}
