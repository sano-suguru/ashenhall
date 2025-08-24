'use client';

import React from 'react';
import type { Card } from '@/types/game';
import { KEYWORD_DEFINITIONS } from '@/lib/card-text-utils';
import { TooltipSection } from './TooltipSection';
import { Star } from 'lucide-react';

interface TooltipKeywordsProps {
  card: Card;
}

export const TooltipKeywords = ({ card }: TooltipKeywordsProps) => {
  if (card.keywords.length === 0) {
    return null;
  }

  return (
    <TooltipSection title="能力" icon={Star} colorClass="text-yellow-300">
      {card.keywords.map((keyword) => (
        <div key={keyword} className="bg-gray-800 bg-opacity-50 px-2 py-1 rounded text-xs">
          <span className="font-bold">{KEYWORD_DEFINITIONS[keyword]?.name || keyword}:</span>
          <span className="ml-1">{KEYWORD_DEFINITIONS[keyword]?.description || '効果の説明がありません'}</span>
        </div>
      ))}
    </TooltipSection>
  );
};
