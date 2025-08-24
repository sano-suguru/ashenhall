'use client';

import React from 'react';
import type { Card } from '@/types/game';
import { FACTION_ICONS } from '@/lib/card-constants';

interface CardHeaderProps {
  card: Card;
}

export const CardHeader = ({ card }: CardHeaderProps) => {
  const FactionIcon = FACTION_ICONS[card.faction];

  return (
    <>
      <div className="absolute -top-2 -left-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white z-10">
        <span className="text-white text-xs font-bold">{card.cost}</span>
      </div>
      <div className="absolute -top-2 -right-2 w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center border-2 border-white z-10">
        <FactionIcon size={14} className="text-white" />
      </div>
    </>
  );
};
