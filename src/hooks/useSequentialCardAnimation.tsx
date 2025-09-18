/**
 * シーケンシャルカード演出フック
 * 
 * 設計方針:
 * - 完了待機原則による段階制御
 * - 攻撃 → 被攻撃 → 破壊の順序制御
 * - useCardAnimationの直列化版
 */

'use client';

import React, { useMemo } from 'react';

/**
 * アニメーションフェーズ（段階制御）
 */
export enum SequentialAnimationPhase {
  IDLE = 'idle',
  ATTACK = 'attack',
  DAMAGE = 'damage', 
  DESTROY = 'destroy',
  COMPLETE = 'complete'
}

/**
 * シーケンシャルアニメーション状態
 */
interface SequentialAnimationState {
  animationClasses: string;
  showDamagePopup: boolean;
  damagePopupElement: React.ReactElement | null;
  currentPhase: SequentialAnimationPhase;
}

/**
 * アニメーションプロパティ
 */
interface UseSequentialCardAnimationProps {
  // 基本プロパティ（従来版との互換性）
  isAttacking: boolean;
  isBeingAttacked: boolean;
  isDying: boolean;
  damageAmount: number;
  
  // 新しいシーケンシャル制御
  animationPhase?: SequentialAnimationPhase;
  forcePhase?: SequentialAnimationPhase;
}

/**
 * シーケンシャルカード演出フック
 * 完了待機原則による段階制御アニメーション
 */
export function useSequentialCardAnimation({
  isAttacking,
  isBeingAttacked,
  isDying,
  damageAmount,
  animationPhase = SequentialAnimationPhase.IDLE,
  forcePhase
}: UseSequentialCardAnimationProps): SequentialAnimationState {
  
  // 現在のフェーズを決定（強制指定があればそれを優先）
  const currentPhase = forcePhase || animationPhase;

  // フェーズに基づくアニメーションクラスの生成
  const animationClasses = useMemo(() => {
    const classes = [];

    switch (currentPhase) {
      case SequentialAnimationPhase.ATTACK:
        if (isAttacking) classes.push('card-attacking');
        if (isBeingAttacked) classes.push('card-being-attacked');
        break;
        
      case SequentialAnimationPhase.DAMAGE:
        if (isBeingAttacked) classes.push('card-being-attacked');
        break;
        
      case SequentialAnimationPhase.DESTROY:
        if (isDying) classes.push('card-dying');
        break;
        
      case SequentialAnimationPhase.IDLE:
      case SequentialAnimationPhase.COMPLETE:
      default:
        // アニメーションなし
        break;
    }

    return classes.join(' ');
  }, [currentPhase, isAttacking, isBeingAttacked, isDying]);

  // ダメージポップアップの表示判定（DAMAGEフェーズでのみ表示）
  const showDamagePopup = useMemo(() => {
    return currentPhase === SequentialAnimationPhase.DAMAGE && 
           isBeingAttacked && 
           damageAmount > 0;
  }, [currentPhase, isBeingAttacked, damageAmount]);

  // ダメージポップアップ要素の生成
  const damagePopupElement = useMemo(() => {
    if (!showDamagePopup) return null;
    
    return (
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full z-20 pointer-events-none">
        <div className="bg-red-500 text-white text-lg font-bold px-2 py-1 rounded shadow-lg animate-damage-popup">
          -{damageAmount}
        </div>
      </div>
    );
  }, [showDamagePopup, damageAmount]);

  return {
    animationClasses,
    showDamagePopup,
    damagePopupElement,
    currentPhase,
  };
}

/**
 * フェーズ遷移ヘルパー関数
 */
export class SequentialAnimationHelper {
  /**
   * 次のフェーズを取得
   */
  static getNextPhase(currentPhase: SequentialAnimationPhase): SequentialAnimationPhase {
    switch (currentPhase) {
      case SequentialAnimationPhase.IDLE:
        return SequentialAnimationPhase.ATTACK;
      case SequentialAnimationPhase.ATTACK:
        return SequentialAnimationPhase.DAMAGE;
      case SequentialAnimationPhase.DAMAGE:
        return SequentialAnimationPhase.DESTROY;
      case SequentialAnimationPhase.DESTROY:
        return SequentialAnimationPhase.COMPLETE;
      case SequentialAnimationPhase.COMPLETE:
      default:
        return SequentialAnimationPhase.IDLE;
    }
  }

  /**
   * フェーズの推定時間を取得
   */
  static getPhaseDuration(phase: SequentialAnimationPhase): number {
    switch (phase) {
      case SequentialAnimationPhase.ATTACK:
        return 300; // 攻撃演出時間
      case SequentialAnimationPhase.DAMAGE:
        return 1000; // ダメージ表示時間
      case SequentialAnimationPhase.DESTROY:
        return 1000; // 破壊演出時間
      default:
        return 0;
    }
  }

  /**
   * フェーズがアクティブかどうか
   */
  static isPhaseActive(phase: SequentialAnimationPhase): boolean {
    return phase !== SequentialAnimationPhase.IDLE && phase !== SequentialAnimationPhase.COMPLETE;
  }
}

/**
 * 従来版との互換性を保つためのラッパー関数
 */
export function useCompatibleCardAnimation(props: {
  isAttacking: boolean;
  isBeingAttacked: boolean;
  isDying: boolean;
  damageAmount: number;
}) {
  // 従来の同時実行ロジックを維持（段階的移行用）
  return useSequentialCardAnimation({
    ...props,
    animationPhase: SequentialAnimationPhase.IDLE, // 従来動作を維持
  });
}
