'use client';

import React from 'react';
import type { Card, FieldCard } from '@/types/game';
import { TooltipHeader } from './tooltip-parts/TooltipHeader';
import { TooltipCreatureStats } from './tooltip-parts/TooltipCreatureStats';
import { TooltipKeywords } from './tooltip-parts/TooltipKeywords';
import { TooltipEffects } from './tooltip-parts/TooltipEffects';
import { TooltipFlavor } from './tooltip-parts/TooltipFlavor';

interface TooltipProps {
  card: Card;
  isFieldCard: boolean;
  fieldCard: FieldCard | null;
  tooltipStyle: React.CSSProperties;
}

export const CardTooltip = ({ card, isFieldCard, fieldCard, tooltipStyle }: TooltipProps) => {
  return (
    <div style={tooltipStyle} className="fixed transition-opacity duration-300 pointer-events-none z-50">
      <div className="px-3 py-2 bg-black bg-opacity-95 text-white text-xs rounded-lg shadow-xl w-96 text-left leading-relaxed border border-gray-600">
        <TooltipHeader card={card} />
        <TooltipCreatureStats card={card} isFieldCard={isFieldCard} fieldCard={fieldCard} />
        <TooltipKeywords card={card} />
        <TooltipEffects card={card} />
        <TooltipFlavor card={card} />
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
      </div>
    </div>
  );
};
