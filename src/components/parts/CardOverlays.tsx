'use client';

import React from 'react';
import type { FieldCard } from '@/types/game';

interface CardOverlaysProps {
  isFieldCard?: boolean;
  fieldCard: FieldCard | null;
}

export const CardOverlays = ({ isFieldCard, fieldCard }: CardOverlaysProps) => {
  return (
    <>
      {isFieldCard && fieldCard && (
        <div className="absolute top-2 left-2 text-xs text-gray-400">
          T{fieldCard.summonTurn}
        </div>
      )}
    </>
  );
};
