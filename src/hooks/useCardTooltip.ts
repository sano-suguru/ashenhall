/**
 * カードツールチップフック
 * 
 * CardComponentとBattleLogModalで共通利用可能な
 * カードツールチップ機能を提供
 */

'use client';

import { useState } from 'react';
import { getCardById } from '@/data/cards/base-cards';
import type { Card } from '@/types/game';

export function useCardTooltip(cardId: string) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const card = getCardById(cardId);
  
  const handleMouseEnter = () => {
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return {
    showTooltip,
    handleMouseEnter,
    handleMouseLeave,
    card,
  };
}
