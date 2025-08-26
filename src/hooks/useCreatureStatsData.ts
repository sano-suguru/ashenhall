/**
 * クリーチャーステータスデータフック
 * 
 * クリーチャーカードの攻撃力・体力・モディファイア値の計算ロジックを提供
 * TooltipCreatureStatsの複雑度削減のために分離
 */

'use client';

import { useMemo } from 'react';
import type { Card, FieldCard } from '@/types/game';

interface CreatureStatsData {
  attackValue: number;
  healthValue: string | number;
  attackModifier: number;
  healthModifier: number;
  hasModifiers: boolean;
}

export function useCreatureStatsData(
  card: Card, 
  isFieldCard: boolean, 
  fieldCard: FieldCard | null
): CreatureStatsData | null {
  return useMemo(() => {
    if (card.type !== 'creature') {
      return null;
    }
    
    const hasFieldModifiers = isFieldCard && fieldCard;
    
    const attackValue = hasFieldModifiers 
      ? card.attack + fieldCard.attackModifier 
      : card.attack;
      
    const healthValue = hasFieldModifiers 
      ? `${fieldCard.currentHealth}/${card.health + fieldCard.healthModifier}` 
      : card.health;
      
    const attackModifier = hasFieldModifiers ? fieldCard.attackModifier : 0;
    const healthModifier = hasFieldModifiers ? fieldCard.healthModifier : 0;
    
    const hasModifiers = Boolean(hasFieldModifiers && 
      (fieldCard!.attackModifier !== 0 || fieldCard!.healthModifier !== 0));
    
    return {
      attackValue,
      healthValue,
      attackModifier,
      healthModifier,
      hasModifiers
    };
  }, [card, isFieldCard, fieldCard]);
}
