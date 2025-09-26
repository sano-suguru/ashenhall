'use client';

import React from 'react';
import type { Card, FieldCard } from '@/types/game';
import { useCreatureStatsData } from '@/hooks/useCreatureStatsData';
import { FACTION_COLORS } from '@/lib/card-constants';
import { getEffectText } from '@/lib/card-text-utils';
import { Sword, Heart } from 'lucide-react';

interface TooltipProps {
  card: Card;
  isFieldCard: boolean;
  fieldCard: FieldCard | null;
  tooltipStyle: React.CSSProperties;
}

// === 統合されたTooltip実装（tooltip-parts統合版） ===

const TooltipHeader = ({ card }: { card: Card }) => (
  <div className="flex items-center gap-2 mb-3 border-b border-gray-600 pb-2">
    <div className={`text-sm font-bold ${FACTION_COLORS[card.faction]}`}>
      [{card.faction.toUpperCase()}]
    </div>
    <div className="text-base font-bold text-white">{card.name}</div>
    <div className="ml-auto text-yellow-400 font-bold">[{card.cost}]</div>
  </div>
);

const TooltipCreatureStats = ({ card, isFieldCard, fieldCard }: { card: Card; isFieldCard: boolean; fieldCard: FieldCard | null }) => {
  const statsData = useCreatureStatsData(card, isFieldCard, fieldCard);

  if (card.type !== 'creature' || !statsData) return null;

  return (
    <div className="flex items-center gap-4 mb-3">
      <div className="flex items-center gap-1">
        <Sword size={14} className="text-red-400" />
        <span className={statsData.hasModifiers ? 'text-yellow-300' : 'text-white'}>
          {statsData.attackValue}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Heart size={14} className="text-green-400" />
        <span className={statsData.hasModifiers ? 'text-yellow-300' : 'text-white'}>
          {statsData.healthValue}
        </span>
      </div>
    </div>
  );
};

const TooltipKeywords = ({ card }: { card: Card }) => {
  if (!card.keywords || card.keywords.length === 0) return null;

  return (
    <div className="mb-3">
      <div className="text-sm font-semibold text-blue-300 mb-1">キーワード</div>
      <div className="space-y-1">
        {card.keywords.map((keyword, index) => (
          <div key={index} className="text-blue-200">
            <span className="font-medium">{keyword}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const TooltipEffects = ({ card }: { card: Card }) => {
  if (!card.effects || card.effects.length === 0) return null;

  return (
    <div className="mb-3">
      <div className="text-sm font-semibold text-purple-300 mb-1">効果</div>
      <div className="space-y-2">
        {card.effects.map((effect, index) => (
          <div key={index} className="text-purple-200">
            {getEffectText(effect, card.type, card.id)}
          </div>
        ))}
      </div>
    </div>
  );
};

const TooltipFlavor = ({ card }: { card: Card }) => {
  if (!card.flavor) return null;

  return (
    <div className="border-t border-gray-600 pt-2 mt-3">
      <div className="text-xs text-gray-300 italic">
        {card.flavor}
      </div>
    </div>
  );
};

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
