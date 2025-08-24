'use client';

import React from 'react';
import type { Card } from '@/types/game';
import { EFFECT_ICONS } from '@/lib/card-constants';
import { Sparkles } from 'lucide-react';

interface CardEffectsIconsProps {
  card: Card;
}

export const CardEffectsIcons = ({ card }: CardEffectsIconsProps) => {
  if (card.effects.length === 0) {
    return null;
  }

  return (
    <div className="px-2 flex justify-center space-x-1">
      {card.effects.slice(0, 3).map((effect, index) => {
        const EffectIcon = EFFECT_ICONS[effect.action] || Sparkles;
        return (
          <span
            key={index}
            className="text-xs"
            title={`${effect.trigger}: ${effect.action} ${effect.value ?? ''}`}
          >
            <EffectIcon size={12} />
          </span>
        );
      })}
    </div>
  );
};
