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
  // 新演出追加
  isSummoning?: boolean;
  isDrawing?: boolean;
  isSpellCasting?: boolean;
  isHealing?: boolean;
  healAmount?: number;
}

export function useCardAnimation({
  isAttacking,
  isBeingAttacked,
  isDying,
  damageAmount,
  isSummoning = false,
  isDrawing = false,
  isSpellCasting = false,
  isHealing = false,
  healAmount = 0,
}: UseCardAnimationProps): AnimationState {
  // 演出用のクラス名を統合生成
  const animationClasses = useMemo(() => {
    const classes = [
      isAttacking && 'card-attacking',
      isBeingAttacked && 'card-being-attacked',
      isDying && 'card-dying',
      isSummoning && 'card-summoning',
      isDrawing && 'card-drawing',
      isSpellCasting && 'card-spell-casting',
      isHealing && 'card-healing'
    ].filter(Boolean);
    
    return classes.join(' ');
  }, [isAttacking, isBeingAttacked, isDying, isSummoning, isDrawing, isSpellCasting, isHealing]);

  // ダメージポップアップの表示判定
  const showDamagePopup = useMemo(() => {
    return isBeingAttacked && damageAmount > 0;
  }, [isBeingAttacked, damageAmount]);

  // 回復ポップアップの表示判定
  const showHealPopup = useMemo(() => {
    return isHealing && healAmount > 0;
  }, [isHealing, healAmount]);

  // ポップアップ要素の生成（ダメージ・回復両対応）
  const damagePopupElement = useMemo(() => {
    if (showDamagePopup) {
      return (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full z-20 pointer-events-none">
          <div className="bg-red-500 text-white text-lg font-bold px-2 py-1 rounded shadow-lg animate-damage-popup">
            -{damageAmount}
          </div>
        </div>
      );
    }
    
    if (showHealPopup) {
      return (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full z-20 pointer-events-none">
          <div className="bg-green-500 text-white text-lg font-bold px-2 py-1 rounded shadow-lg animate-heal-popup">
            +{healAmount}
          </div>
        </div>
      );
    }
    
    return null;
  }, [showDamagePopup, damageAmount, showHealPopup, healAmount]);

  return {
    animationClasses,
    showDamagePopup: showDamagePopup || showHealPopup,
    damagePopupElement,
  };
}
