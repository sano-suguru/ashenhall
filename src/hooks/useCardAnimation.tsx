/**
 * カード演出フック
 * 
 * CardComponentから演出関連のロジックを分離し、
 * 複雑度を削減するためのフック
 */

'use client';

import React, { useMemo } from 'react';
import type { CardAnimationState } from '@/types/animation';
import { getAnimationCssClass } from '@/types/animation';

interface AnimationResult {
  animationClasses: string;
  showDamagePopup: boolean;
  damagePopupElement: React.ReactElement | null;
}

interface UseCardAnimationProps {
  /** 統合されたアニメーション状態 */
  animationState: CardAnimationState;
}

export function useCardAnimation({
  animationState,
}: UseCardAnimationProps): AnimationResult {
  // CSS演出クラス名を取得
  const animationClasses = useMemo(() => {
    return getAnimationCssClass(animationState);
  }, [animationState]);

  // ダメージポップアップの表示判定
  const showDamagePopup = useMemo(() => {
    return animationState.kind === 'being_attacked' && (animationState.value || 0) > 0;
  }, [animationState]);

  // 回復ポップアップの表示判定
  const showHealPopup = useMemo(() => {
    return animationState.kind === 'healing' && (animationState.value || 0) > 0;
  }, [animationState]);

  // ポップアップ要素の生成（ダメージ・回復両対応）
  const damagePopupElement = useMemo(() => {
    if (showDamagePopup) {
      const damage = animationState.value || 0;
      return (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full z-20 pointer-events-none">
          <div className="bg-red-500 text-white text-lg font-bold px-2 py-1 rounded shadow-lg animate-damage-popup">
            -{damage}
          </div>
        </div>
      );
    }
    
    if (showHealPopup) {
      const healAmount = animationState.value || 0;
      return (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full z-20 pointer-events-none">
          <div className="bg-green-500 text-white text-lg font-bold px-2 py-1 rounded shadow-lg animate-heal-popup">
            +{healAmount}
          </div>
        </div>
      );
    }
    
    return null;
  }, [showDamagePopup, showHealPopup, animationState.value]);

  return {
    animationClasses,
    showDamagePopup: showDamagePopup || showHealPopup,
    damagePopupElement,
  };
}
