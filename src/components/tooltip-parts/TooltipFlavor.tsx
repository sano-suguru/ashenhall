'use client';

import React from 'react';
import type { Card } from '@/types/game';

interface TooltipFlavorProps {
  card: Card;
}

export const TooltipFlavor = ({ card }: TooltipFlavorProps) => {
  if (!card.flavor) {
    return null;
  }

  return (
    <div className="border-t border-gray-600 pt-2">
      <div className="text-gray-400 italic text-xs leading-relaxed text-center">
        &ldquo;{card.flavor}&rdquo;
      </div>
    </div>
  );
};
