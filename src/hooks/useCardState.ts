/**
 * カード状態計算フック
 * 
 * CardComponentから状態計算ロジックを分離し、
 * 複雑度を削減するためのフック
 */

'use client';

import { useMemo } from 'react';
import type { Card, FieldCard } from '@/types/game';

interface CardStateResult {
  fieldCard: FieldCard | null;
  isDamaged: boolean;
  isEnhanced: boolean;
}

export function useCardState(card: Card, isFieldCard: boolean): CardStateResult {
  const fieldCard = useMemo(
    () => isFieldCard ? card as FieldCard : null,
    [card, isFieldCard]
  );

  const isDamaged = useMemo(() => {
    if (!fieldCard) return false;
    
    const baseHealth = card.type === 'creature' ? card.health : 0;
    const modifiedMaxHealth = baseHealth + (fieldCard.healthModifier || 0);
    return fieldCard.currentHealth < modifiedMaxHealth;
  }, [fieldCard, card]);

  const isEnhanced = useMemo(() => {
    if (!fieldCard) return false;
    
    return (fieldCard.attackModifier !== 0 || fieldCard.healthModifier !== 0);
  }, [fieldCard]);

  return {
    fieldCard,
    isDamaged,
    isEnhanced,
  };
}
