/**
 * ゲーム進行管理フック - アクション単位演出システム
 * 
 * 設計方針:
 * - アクションタイプ別の統一演出制御
 * - フェーズ依存の冗長性を排除
 * - 将来の演出拡張への準備完了
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { GameState, GameAction } from '@/types/game';
import { processGameStep } from '@/lib/game-engine/core';
import { reconstructStateAtSequence, getTurnNumberForAction } from '@/lib/game-state-utils';
import { AnimationManager, AnimationIntegration } from '@/lib/animation-manager';
import { ACTION_ANIMATION_DURATIONS } from '@/types/animation';
import type { AnimationState } from '@/types/animation';

// 旧ACTION_DELAYSは新しいACTION_ANIMATION_DURATIONSに統合済み
// （後方互換性のため残存、段階的に廃止予定）

// AttackSequenceState インターフェース（統合演出システム用）
interface AttackSequenceState {
  isShowingAttackSequence: boolean;
  currentAttackIndex: number;
  attackActions: GameAction[];
}

/**
 * アクション単位の演出遅延時間を計算（新システム統合版）
 */
function getActionDelay(action: GameAction, gameSpeed: number): number {
  const baseDelay = ACTION_ANIMATION_DURATIONS[action.type] || 300;
  return Math.max(50, baseDelay / gameSpeed);
}

/**
 * 現在のゲームステップで発生したアクションを取得
 * 防御的プログラミング: null/undefined セーフティ
 */
function getCurrentStepActions(gameState: GameState | null | undefined, previousActionCount: number): GameAction[] {
  if (!gameState || !gameState.actionLog) {
    return [];
  }
  return gameState.actionLog.slice(previousActionCount);
}

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
  
  // 攻撃演出状態
  attackSequenceState: AttackSequenceState;
  currentAttackAction: GameAction | null;
  
  // アニメーション状態管理
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
 * ゲーム進行管理フック
 * page.tsx内の複雑なゲーム進行useEffectとGameBoard.tsx内のAttackSequence管理を統合
 */
export const useGameProgress = (config: GameProgressConfig): GameProgressReturn => {
  const [attackSequenceState, setAttackSequenceState] = useState<AttackSequenceState>({
    isShowingAttackSequence: false,
    currentAttackIndex: 0,
    attackActions: []
  });
  
  const [progressError, setProgressError] = useState<Error | null>(null);
  const [enhancedGameState, setEnhancedGameState] = useState<GameState & { animationState: AnimationState } | null>(null);

  // GameBoard.tsx の calculateSequenceForTurn を移植（null対応追加）
  const calculateSequenceForTurn = useCallback((gs: GameState | null, targetTurn: number): number => {
    if (!gs) return 0; // null チェック追加
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
  }, []);

  // 表示状態の計算（GameBoard.tsx から移植）
  const displayState = useMemo(() => {
    // Phase 1 リプレイモード対応（優先判定）
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

  // 指定ターンの攻撃アクションを抽出（GameBoard.tsx から移植）
  const getAttackActionsForTurn = useCallback((gs: GameState, targetTurn: number): GameAction[] => {
    return gs.actionLog.filter(action => {
      if (action.type !== 'card_attack') return false;
      const actionTurn = getTurnNumberForAction(action, gs);
      return actionTurn === targetTurn;
    });
  }, []);

  // 攻撃シーケンスが完了したかチェック
  const isAttackSequenceComplete = useCallback((): boolean => {
    return attackSequenceState.currentAttackIndex >= attackSequenceState.attackActions.length;
  }, [attackSequenceState.currentAttackIndex, attackSequenceState.attackActions.length]);

  // 現在表示中の攻撃アクションを取得
  const getCurrentAttackAction = useCallback((): GameAction | null => {
    if (!attackSequenceState.isShowingAttackSequence) return null;
    if (attackSequenceState.currentAttackIndex >= attackSequenceState.attackActions.length) return null;
    return attackSequenceState.attackActions[attackSequenceState.currentAttackIndex] || null;
  }, [attackSequenceState]);

  // カードのアニメーション状態を取得する関数
  const getCardAnimationState = useCallback((cardId: string) => {
    if (!enhancedGameState?.animationState) {
      return {
        isAttacking: false,
        isBeingAttacked: false,
        isDying: false,
        damageAmount: 0,
      };
    }
    
    return AnimationManager.getCardAnimationState(
      enhancedGameState.animationState,
      cardId
    );
  }, [enhancedGameState]);

  // GameState変更時のenhancedGameState同期
  useEffect(() => {
    if (config.gameState) {
      if ('animationState' in config.gameState) {
        setEnhancedGameState(config.gameState as GameState & { animationState: AnimationState });
      } else {
        const enhanced = AnimationIntegration.enhanceGameState(config.gameState);
        setEnhancedGameState(enhanced);
      }
    }
  }, [config.gameState]);

  // 演出完了監視システム（100ms間隔）
  useEffect(() => {
    if (!enhancedGameState?.animationState || config.gameState?.result || !config.isPlaying) {
      return;
    }
    
    const animationTimer = setInterval(() => {
      const currentState = enhancedGameState;
      const updatedState = AnimationIntegration.updateWithAnimations(
        currentState,
        config.gameSpeed
      );
      
      // 破壊処理が実行された場合のみ状態更新
      const destructionCountChanged = 
        updatedState.animationState.pendingDestructions.length !== 
        currentState.animationState.pendingDestructions.length;
      
      const animationCountChanged = 
        updatedState.animationState.activeAnimations.length !== 
        currentState.animationState.activeAnimations.length;
      
      if (destructionCountChanged || animationCountChanged) {
        console.log('🔄 Animation state updated:', {
          pendingDestructions: updatedState.animationState.pendingDestructions.length,
          activeAnimations: updatedState.animationState.activeAnimations.length
        });
        setEnhancedGameState(updatedState);
        config.onGameStateChange(updatedState);
      }
    }, 100);
    
    return () => clearInterval(animationTimer);
  }, [enhancedGameState, config.gameSpeed, config.gameState, config.isPlaying]);

  // エラーリセット用useEffect
  useEffect(() => {
    setProgressError(null);
  }, [config.gameState, config.currentTurn, config.mode, config.replayData]);

  // メインのゲーム進行useEffect（アクション単位演出システム）
  useEffect(() => {
    if (!config.gameState || !config.isPlaying || config.gameState.result) {
      return;
    }

    // 過去ターン表示中の場合
    if (config.currentTurn !== -1 && config.currentTurn < config.gameState.turnNumber) {
      // 過去ターンから最新まで段階的に進行
      const timer = setTimeout(() => {
        const nextTurn = config.currentTurn + 1;
        if (nextTurn >= config.gameState!.turnNumber) {
          // 最新に到達したらライブモードに戻る
          config.onGameStateChange({ 
            ...config.gameState!, 
            /* currentTurn を -1 に設定するロジックは上位コンポーネントで処理 */
          });
        } else {
          // 次のターンに進む（上位コンポーネントのsetCurrentTurnで処理）
        }
      }, Math.max(200, 1000 / config.gameSpeed)); // 最小200ms、速度調整可能
      
      return () => clearTimeout(timer);
    }
    
    // 最新ターンの場合のみ実際のゲーム進行
    if (config.currentTurn === -1 || config.currentTurn >= config.gameState.turnNumber) {
      // 現在のアクション数を記録（新アクション検出用）
      const previousActionCount = config.gameState.actionLog.length;
      
      const processNextStep = () => {
        try {
          const nextState = processGameStep(config.gameState!);
          
          // 戻り値の検証（防御的プログラミング）
          if (!nextState || !nextState.actionLog) {
            console.warn('processGameStep returned invalid state, skipping step');
            return;
          }
          
          // 新しく追加されたアクションを取得
          const newActions = getCurrentStepActions(nextState, previousActionCount);
          
          // アニメーション統合システムで状態を更新
          const updatedEnhancedState = enhancedGameState 
            ? AnimationIntegration.updateWithAnimations({
                ...enhancedGameState,
                ...nextState
              }, config.gameSpeed)
            : AnimationIntegration.enhanceGameState(nextState);
          
          setEnhancedGameState(updatedEnhancedState);
          
          // 新アクションがある場合、最初のアクションの遅延時間を使用
          const actionDelay = newActions.length > 0 
            ? getActionDelay(newActions[0], config.gameSpeed)
            : Math.max(50, 200 / config.gameSpeed); // デフォルト遅延
          
          config.onGameStateChange(nextState);
          
          // ゲームが終了した場合
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
      const actionDelay = Math.max(50, 250 / config.gameSpeed); // 基本遅延
      const timer = setTimeout(processNextStep, actionDelay);
      return () => clearTimeout(timer);
    }
  }, [config.gameState, config.isPlaying, config.currentTurn, config.gameSpeed, enhancedGameState]);

  // 攻撃シーケンス開始の検出（GameBoard.tsx から移植）
  useEffect(() => {
    if (!config.gameState) return;
    
    // 最新ターン表示かつ再生中の場合のみ攻撃演出を実行
    if (config.isPlaying && (config.currentTurn === -1 || config.currentTurn >= config.gameState.turnNumber)) {
      const attackActions = getAttackActionsForTurn(config.gameState, config.gameState.turnNumber);
      
      if (attackActions.length > 0 && !attackSequenceState.isShowingAttackSequence) {
        // 攻撃アクションがある場合は攻撃シーケンス開始（表示のみ）
        setAttackSequenceState({
          isShowingAttackSequence: true,
          currentAttackIndex: 0,
          attackActions: attackActions
        });
      }
    }
  }, [
    config.gameState, 
    config.isPlaying, 
    config.currentTurn, 
    attackSequenceState.isShowingAttackSequence,
    getAttackActionsForTurn
  ]);

  // 攻撃シーケンス進行の制御（GameBoard.tsx から移植）
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
        }, 800 / config.gameSpeed);

        return () => clearTimeout(timer);
      }
    }
  }, [attackSequenceState.currentAttackIndex, attackSequenceState.isShowingAttackSequence, config.gameSpeed, isAttackSequenceComplete]);

  return {
    displayState,
    attackSequenceState,
    currentAttackAction: getCurrentAttackAction(),
    getCardAnimationState,
    progressError,
  };
};
