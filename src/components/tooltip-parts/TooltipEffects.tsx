'use client';

import React from 'react';
import type { Card } from '@/types/game';
import { getEffectText } from '@/lib/card-text-utils';
import { TooltipSection } from './TooltipSection';
import { Sparkles } from 'lucide-react';

interface TooltipEffectsProps {
  card: Card;
}

export const TooltipEffects = ({ card }: TooltipEffectsProps) => {
  if (card.effects.length === 0) {
    return null;
  }

  return (
    <TooltipSection title="効果" icon={Sparkles} colorClass="text-purple-300">
      {card.effects.map((effect, index) => (
        <div key={index} className="bg-gray-800 bg-opacity-50 px-2 py-1 rounded text-xs">
          {getEffectText(effect, card.type, card.id)}
        </div>
      ))}
    </TooltipSection>
  );
};
