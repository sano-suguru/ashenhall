/**
 * 攻撃シーケンス管理フック（useGameProgressから分離）
 * 
 * 設計方針:
 * - 攻撃演出の責任をuseGameProgressから分離
 * - 単一責任の原則に従った設計
 * - Phase 1リプレイ機能への準備
 */

import { useState, useEffect, useCallback } from 'react';
import type { GameState, GameAction } from '@/types/game';
import { getTurnNumberForAction } from '@/lib/game-state-utils';

// 攻撃シーケンス状態管理
interface AttackSequenceState {
  isShowingAttackSequence: boolean;
  currentAttackIndex: number;
  attackActions: GameAction[];
}

export interface AttackSequenceConfig {
  gameState: GameState | null;
  isPlaying: boolean;
  currentTurn: number;
  gameSpeed: number;
}

export interface AttackSequenceReturn {
  attackSequenceState: AttackSequenceState;
  currentAttackAction: GameAction | null;
  getCardAnimationState: (cardId: string) => {
    isAttacking: boolean;
    isBeingAttacked: boolean;
    isDying: boolean;
    damageAmount: number;
  };
}

/**
 * 攻撃シーケンス管理フック
 * useGameProgressから攻撃演出責任を分離
 */
export const useAttackSequence = (config: AttackSequenceConfig): AttackSequenceReturn => {
  const [attackSequenceState, setAttackSequenceState] = useState<AttackSequenceState>({
    isShowingAttackSequence: false,
    currentAttackIndex: 0,
    attackActions: []
  });

  // 指定ターンの攻撃アクションを抽出
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

  // カードのアニメーション状態を取得
  const getCardAnimationState = useCallback((cardId: string) => {
    const currentAction = getCurrentAttackAction();
    
    if (!currentAction || currentAction.type !== 'card_attack') {
      return {
        isAttacking: false,
        isBeingAttacked: false,
        isDying: false,
        damageAmount: 0,
      };
    }
    
    const animationData = currentAction.data.animation;
    
    return {
      isAttacking: animationData.attackingCardId === cardId,
      isBeingAttacked: animationData.beingAttackedCardId === cardId,
      isDying: animationData.isTargetDestroyed && animationData.beingAttackedCardId === cardId,
      damageAmount: animationData.beingAttackedCardId === cardId ? animationData.displayDamage : 0,
    };
  }, [getCurrentAttackAction]);

  // 攻撃シーケンス開始の検出
  useEffect(() => {
    if (!config.gameState) return;
    
    // 最新ターン表示かつ再生中の場合のみ攻撃演出を実行
    if (config.isPlaying && (config.currentTurn === -1 || config.currentTurn >= config.gameState.turnNumber)) {
      const attackActions = getAttackActionsForTurn(config.gameState, config.gameState.turnNumber);
      
      if (attackActions.length > 0 && !attackSequenceState.isShowingAttackSequence) {
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

  // 攻撃シーケンス進行の制御
  useEffect(() => {
    if (attackSequenceState.isShowingAttackSequence) {
      if (isAttackSequenceComplete()) {
        // 攻撃シーケンス完了
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
    attackSequenceState,
    currentAttackAction: getCurrentAttackAction(),
    getCardAnimationState,
  };
};
