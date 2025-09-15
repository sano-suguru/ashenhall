/**
 * ゲーム進行管理フック（Phase B簡素化版）
 * 
 * 設計方針:
 * - 攻撃シーケンス管理をuseAttackSequenceに委譲
 * - 単一責任：ゲーム進行とリプレイ表示のみ
 * - 個人開発の保守性重視
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { GameState, GameAction } from '@/types/game';
import { processGameStep } from '@/lib/game-engine/core';
import { reconstructStateAtSequence } from '@/lib/game-state-utils';
import { useAttackSequence } from './useAttackSequence';

export interface GameProgressConfig {
  gameState: GameState | null;
  isPlaying: boolean;
  currentTurn: number;
  gameSpeed: number;
  onGameStateChange: (newState: GameState) => void;
  onGameFinished?: () => void;
  onStatsUpdate?: (gameState: GameState) => void;
  
  // Phase 1 拡張準備
  mode?: 'local' | 'replay';
  replayData?: GameState;
}

export interface GameProgressReturn {
  // 表示用ゲーム状態
  displayState: GameState | null;
  
  // 攻撃演出状態（useAttackSequenceに委譲）
  attackSequenceState: {
    isShowingAttackSequence: boolean;
    currentAttackIndex: number;
    attackActions: GameAction[];
  };
  currentAttackAction: GameAction | null;
  getCardAnimationState: (cardId: string) => {
    isAttacking: boolean;
    isBeingAttacked: boolean;
    isDying: boolean;
    damageAmount: number;
  };
  
  // エラー状態
  progressError: Error | null;
}

/**
 * ゲーム進行管理フック（Phase B簡素化版）
 * 攻撃シーケンス管理の責任をuseAttackSequenceに分離
 */
export const useGameProgress = (config: GameProgressConfig): GameProgressReturn => {
  const [progressError, setProgressError] = useState<Error | null>(null);
  
  // 攻撃シーケンス管理を分離されたフックに委譲
  const attackSequence = useAttackSequence({
    gameState: config.gameState,
    isPlaying: config.isPlaying,
    currentTurn: config.currentTurn,
    gameSpeed: config.gameSpeed,
  });

  // ターンに対応するシーケンス計算
  const calculateSequenceForTurn = useCallback((gs: GameState | null, targetTurn: number): number => {
    if (!gs) return 0;
    if (targetTurn <= 1) return 0;
    if (targetTurn > gs.turnNumber) return gs.actionLog[gs.actionLog.length - 1]?.sequence ?? 0;

    const drawPhaseStarts = gs.actionLog.filter(
      a => a.type === 'phase_change' && a.data.toPhase === 'draw'
    );

    const startOfTurnAction = drawPhaseStarts[targetTurn - 1];

    if (startOfTurnAction) {
      return startOfTurnAction.sequence > 0 ? startOfTurnAction.sequence - 1 : 0;
    }

    return gs.actionLog[gs.actionLog.length - 1]?.sequence ?? 0;
  }, []);

  // 表示状態の計算
  const displayState = useMemo(() => {
    const sourceState = (config.mode === 'replay' && config.replayData) 
      ? config.replayData 
      : config.gameState;
      
    if (!sourceState) return null;
    
    // 復元条件の明確化
    const needsReconstruction = (
      config.currentTurn !== -1 && 
      config.currentTurn < sourceState.turnNumber
    );
    
    if (!needsReconstruction) {
      return sourceState;
    }
    
    // 状態復元実行
    try {
      const targetSequence = calculateSequenceForTurn(sourceState, config.currentTurn);
      return reconstructStateAtSequence(sourceState, targetSequence);
    } catch (error) {
      console.error('Failed to reconstruct state:', error);
      setProgressError(error instanceof Error ? error : new Error('状態復元に失敗しました'));
      return sourceState;
    }
  }, [config.gameState, config.currentTurn, config.mode, config.replayData, calculateSequenceForTurn]);

  // エラーリセット
  useEffect(() => {
    setProgressError(null);
  }, [config.gameState, config.currentTurn, config.mode, config.replayData]);

  // メインのゲーム進行制御（簡素化）
  useEffect(() => {
    if (!config.gameState || !config.isPlaying || config.gameState.result) {
      return;
    }

    // 過去ターン表示中の場合
    if (config.currentTurn !== -1 && config.currentTurn < config.gameState.turnNumber) {
      return; // 表示のみ、進行はしない
    }
    
    // 最新ターンの場合のみ実際のゲーム進行
    if (config.currentTurn === -1 || config.currentTurn >= config.gameState.turnNumber) {
      const processNextStep = () => {
        try {
          const nextState = processGameStep(config.gameState!);
          
          if (!nextState || !nextState.actionLog) {
            console.warn('processGameStep returned invalid state, skipping step');
            return;
          }
          
          config.onGameStateChange(nextState);
          
          // ゲーム終了時のコールバック
          if (nextState.result) {
            config.onGameFinished?.();
            config.onStatsUpdate?.(nextState);
          }
        } catch (error) {
          console.error('Game step processing failed:', error);
          setProgressError(error instanceof Error ? error : new Error('ゲーム進行でエラーが発生しました'));
        }
      };

      // アクション演出時間後に次のステップを実行
      const actionDelay = Math.max(50, 250 / config.gameSpeed);
      const timer = setTimeout(processNextStep, actionDelay);
      return () => clearTimeout(timer);
    }
  }, [config]);

  return {
    displayState,
    attackSequenceState: attackSequence.attackSequenceState,
    currentAttackAction: attackSequence.currentAttackAction,
    getCardAnimationState: attackSequence.getCardAnimationState,
    progressError,
  };
};
