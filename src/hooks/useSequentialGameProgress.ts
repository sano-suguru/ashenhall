/**
 * シーケンシャルゲーム進行管理フック
 *
 * 設計方針:
 * - CompletionAwareProcessorに処理を完全委譲
 * - 循環参照完全解消による薄いラッパー設計
 * - 従来インターフェース互換性維持
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { GameState, GameAction, CardAnimationState } from '@/types/game';
import { ANIMATION_NONE } from '@/types/game';
import { reconstructStateAtSequence } from '@/lib/game-state-utils';
import {
  CompletionAwareProcessor,
  type AnimationState,
} from '@/lib/game-engine/completion-aware-processor';

/**
 * アニメーション状態判定ヘルパー関数（複雑度最適化版）
 */
function determineCardAnimationFromState(
  animationType: AnimationState['animationType'],
  sourceCardId: string | undefined,
  targetCardId: string | undefined,
  cardId: string,
  animationValue: number | undefined
): CardAnimationState {
  // sourceCardベースの演出
  if (sourceCardId === cardId) {
    if (animationType === 'attack') return { kind: 'attacking' };
    if (animationType === 'spell_cast') return { kind: 'spell_casting' };
  }

  // targetCardベースの演出
  if (targetCardId === cardId) {
    const animationMap: Record<string, { kind: CardAnimationState['kind']; hasValue?: boolean }> = {
      attack: { kind: 'being_attacked' },
      damage: { kind: 'being_attacked', hasValue: true },
      destroy: { kind: 'dying' },
      summon: { kind: 'summoning' },
      draw: { kind: 'drawing' },
      heal: { kind: 'healing', hasValue: true },
    };

    const mapping = animationMap[animationType];
    if (mapping) {
      return mapping.hasValue
        ? { kind: mapping.kind, value: animationValue || 0 }
        : { kind: mapping.kind };
    }
  }

  return ANIMATION_NONE;
}

export interface SequentialGameProgressConfig {
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

interface SequentialGameProgressReturn {
  // 表示用ゲーム状態
  displayState: GameState | null;

  // 現在のアニメーション状態
  currentAnimationState: {
    isAnimating: boolean;
    animationType:
      | 'attack'
      | 'damage'
      | 'destroy'
      | 'summon'
      | 'draw'
      | 'spell_cast'
      | 'heal'
      | 'none';
    sourceCardId: string | undefined;
    targetCardId: string | undefined;
  };

  // 従来インターフェース互換性（GameProgressReturn との互換性）
  currentAttackAction: GameAction | null;
  attackSequenceState: {
    isShowingAttackSequence: boolean;
    currentAttackIndex: number;
    attackActions: GameAction[];
  };

  // カードアニメーション状態取得関数（統合型）
  getCardAnimationState: (cardId: string) => CardAnimationState;

  // エラー状態
  progressError: Error | null;

  // 処理状態
  isProcessing: boolean;
}

/**
 * シーケンシャルゲーム進行管理フック
 * 循環参照解消による薄いラッパー実装
 */
export const useSequentialGameProgress = (
  config: SequentialGameProgressConfig
): SequentialGameProgressReturn => {
  const [progressError, setProgressError] = useState<Error | null>(null);
  const [currentAnimationState, setCurrentAnimationState] = useState<AnimationState>({
    isAnimating: false,
    animationType: 'none',
    sourceCardId: undefined,
    targetCardId: undefined,
  });

  // プロセッサーインスタンス（フック内で独立管理）
  const processorRef = useRef(new CompletionAwareProcessor());

  // 安定したコールバック参照管理（ESLint対応）
  const stableCallbacksRef = useRef({
    onGameStateChange: config.onGameStateChange,
    onGameFinished: config.onGameFinished,
    onStatsUpdate: config.onStatsUpdate,
  });

  // コールバック更新の安全な反映
  useEffect(() => {
    stableCallbacksRef.current = {
      onGameStateChange: config.onGameStateChange,
      onGameFinished: config.onGameFinished,
      onStatsUpdate: config.onStatsUpdate,
    };
  }, [config.onGameStateChange, config.onGameFinished, config.onStatsUpdate]);

  // ターンに対応するシーケンス計算
  const calculateSequenceForTurn = useCallback(
    (gs: GameState | null, targetTurn: number): number => {
      if (!gs) return 0;
      if (targetTurn <= 1) return 0;
      if (targetTurn > gs.turnNumber) return gs.actionLog[gs.actionLog.length - 1]?.sequence ?? 0;

      const drawPhaseStarts = gs.actionLog.filter(
        (a) => a.type === 'phase_change' && a.data.toPhase === 'draw'
      );

      const startOfTurnAction = drawPhaseStarts[targetTurn - 1];

      if (startOfTurnAction) {
        return startOfTurnAction.sequence > 0 ? startOfTurnAction.sequence - 1 : 0;
      }

      return gs.actionLog[gs.actionLog.length - 1]?.sequence ?? 0;
    },
    []
  );

  // 表示状態の計算
  const displayState = useMemo(() => {
    const sourceState =
      config.mode === 'replay' && config.replayData ? config.replayData : config.gameState;

    if (!sourceState) return null;

    // 復元条件の明確化
    const needsReconstruction =
      config.currentTurn !== -1 && config.currentTurn < sourceState.turnNumber;

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
  }, [
    config.gameState,
    config.currentTurn,
    config.mode,
    config.replayData,
    calculateSequenceForTurn,
  ]);

  // ゲーム速度の更新
  useEffect(() => {
    processorRef.current.setGameSpeed(config.gameSpeed);
  }, [config.gameSpeed]);

  // エラーリセット
  useEffect(() => {
    setProgressError(null);
  }, [config.gameState, config.currentTurn, config.mode, config.replayData]);

  // Processor設定更新（循環参照解消：コールバックはProcessor側で管理）
  useEffect(() => {
    processorRef.current.updateAutonomousConfig({
      gameState: config.gameState,
      isPlaying: config.isPlaying,
      currentTurn: config.currentTurn,
      gameSpeed: config.gameSpeed,
      onStateChange: stableCallbacksRef.current.onGameStateChange,
      onGameFinished: stableCallbacksRef.current.onGameFinished,
      onStatsUpdate: stableCallbacksRef.current.onStatsUpdate,
      onAnimationStateChange: setCurrentAnimationState,
      onError: setProgressError,
    });
  }, [config.gameState, config.isPlaying, config.currentTurn, config.gameSpeed]);

  // 自律的ゲーム進行制御（Processor駆動）
  useEffect(() => {
    const processor = processorRef.current; // エフェクト内でコピー（ESLint対応）

    if (!config.isPlaying || !config.gameState || config.gameState.result) {
      processor.stopAutonomousGameProcessing();
      return;
    }

    // 最新ターンの場合のみ自律的ゲーム進行開始
    if (config.currentTurn === -1 || config.currentTurn >= config.gameState.turnNumber) {
      processor.startAutonomousGameProcessing();
    } else {
      processor.stopAutonomousGameProcessing();
    }

    // クリーンアップでProcessorを停止
    return () => {
      processor.stopAutonomousGameProcessing(); // コピーした変数を使用
    };
  }, [config.isPlaying, config.gameState, config.currentTurn]);

  // カードアニメーション状態取得関数（統合型・複雑度最適化版）
  const getCardAnimationState = useCallback(
    (cardId: string): CardAnimationState => {
      if (!currentAnimationState.isAnimating) {
        return ANIMATION_NONE;
      }

      return determineCardAnimationFromState(
        currentAnimationState.animationType,
        currentAnimationState.sourceCardId,
        currentAnimationState.targetCardId,
        cardId,
        currentAnimationState.value
      );
    },
    [currentAnimationState]
  );

  return {
    displayState,
    currentAnimationState,
    // 従来インターフェース互換性
    currentAttackAction: null, // シーケンシャル版では単一アクション概念を廃止
    attackSequenceState: {
      isShowingAttackSequence: currentAnimationState.isAnimating,
      currentAttackIndex: 0,
      attackActions: [],
    },
    getCardAnimationState,
    progressError,
    isProcessing: processorRef.current.isCurrentlyProcessing(),
  };
};
