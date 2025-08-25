'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { GameState } from '@/types/game';
import { loadStats, saveStats, updateStatsWithGameResult } from '@/lib/stats-utils';
import { GAME_CONSTANTS } from '@/types/game';
import BattleLogModal from './BattleLogModal';
import { reconstructStateAtSequence } from '@/lib/game-state-utils';
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
            <PlayerArea player={displayState.players.player2} energyLimit={currentEnergyLimit} isOpponent={true} />
            {showLog && <RecentLog actions={recentActions} gameState={gameState} />}
            <PlayerArea player={displayState.players.player1} energyLimit={currentEnergyLimit} isOpponent={false} />
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
