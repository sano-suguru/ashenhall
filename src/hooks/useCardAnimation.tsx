/**
 * カード演出フック
 * 
 * CardComponentから演出関連のロジックを分離し、
 * 複雑度を削減するためのフック
 */

'use client';

import React, { useMemo } from 'react';

interface AnimationState {
  animationClasses: string;
  showDamagePopup: boolean;
  damagePopupElement: React.ReactElement | null;
}

interface UseCardAnimationProps {
  isAttacking: boolean;
  isBeingAttacked: boolean;
  isDying: boolean;
  damageAmount: number;
}

export function useCardAnimation({
  isAttacking,
  isBeingAttacked,
  isDying,
  damageAmount,
}: UseCardAnimationProps): AnimationState {
  // 演出用のクラス名を統合生成
  const animationClasses = useMemo(() => {
    const classes = [
      isAttacking && 'card-attacking',
      isBeingAttacked && 'card-being-attacked',
      isDying && 'card-dying'
    ].filter(Boolean);
    
    return classes.join(' ');
  }, [isAttacking, isBeingAttacked, isDying]);

  // ダメージポップアップの表示判定
  const showDamagePopup = useMemo(() => {
    return isBeingAttacked && damageAmount > 0;
  }, [isBeingAttacked, damageAmount]);

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
  };
}
