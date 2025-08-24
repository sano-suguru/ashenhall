'use client';

import React from 'react';
import type { Card } from '@/types/game';
import { FACTION_ICONS } from '@/lib/card-constants';

interface CardArtProps {
  card: Card;
  size: 'small' | 'medium' | 'large';
  factionStyle: {
    accent: string;
  };
}

export const CardArt = ({ card, size, factionStyle }: CardArtProps) => {
  const FactionIcon = FACTION_ICONS[card.faction];
  const iconSize = size === 'small' ? 20 : size === 'medium' ? 28 : 36;

  return (
    <div className="h-1/2 p-2 flex items-center justify-center">
      <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 rounded border border-gray-600 flex items-center justify-center">
        <FactionIcon size={iconSize} className={factionStyle.accent} />
      </div>
    </div>
  );
};
