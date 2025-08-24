'use client';

import React from 'react';
import type { FieldCard } from '@/types/game';

interface CardOverlaysProps {
  isFieldCard?: boolean;
  fieldCard: FieldCard | null;
  isEnhanced: boolean;
  isDamaged: boolean;
}

export const CardOverlays = ({ isFieldCard, fieldCard, isEnhanced, isDamaged }: CardOverlaysProps) => {
  return (
    <>
      {isFieldCard && fieldCard && (
        <div className="absolute top-2 left-2 text-xs text-gray-400">
          T{fieldCard.summonTurn}
        </div>
      )}
      {isEnhanced && (
        <div className="absolute inset-0 rounded-lg bg-green-400 opacity-20 animate-pulse pointer-events-none" />
      )}
      {isDamaged && (
        <div className="absolute inset-0 rounded-lg bg-red-600 opacity-30 pointer-events-none" />
      )}
    </>
  );
};
