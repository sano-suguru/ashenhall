'use client';

import React from 'react';
import type { Card, FieldCard } from '@/types/game';
// 旧useCreatureStatsData.tsから統合
import { useMemo } from 'react';
import { FACTION_COLORS, FACTION_ICONS } from '@/lib/card-constants';
import { getEffectText } from '@/lib/card-text-utils';
import { Sword, Heart, Zap } from 'lucide-react';

interface TooltipProps {
  card: Card;
  isFieldCard: boolean;
  fieldCard: FieldCard | null;
  tooltipStyle: React.CSSProperties;
}

// === 統合されたHook実装（旧useCreatureStatsData.tsから統合） ===

interface CreatureStatsData {
  attackValue: number;
  healthValue: string | number;
  attackModifier: number;
  healthModifier: number;
  hasModifiers: boolean;
}

function useCreatureStatsData(
  card: Card, 
  isFieldCard: boolean, 
  fieldCard: FieldCard | null
): CreatureStatsData | null {
  return useMemo(() => {
    if (card.type !== 'creature') {
      return null;
    }
    
    const hasFieldModifiers = isFieldCard && fieldCard;
    
    const attackValue = hasFieldModifiers 
      ? card.attack + fieldCard.attackModifier 
      : card.attack;
      
    const healthValue = card.health + (hasFieldModifiers ? fieldCard.healthModifier : 0);
      
    const attackModifier = hasFieldModifiers ? fieldCard.attackModifier : 0;
    const healthModifier = hasFieldModifiers ? fieldCard.healthModifier : 0;
    
    const hasModifiers = Boolean(hasFieldModifiers && 
      (fieldCard!.attackModifier !== 0 || fieldCard!.healthModifier !== 0));
    
    return {
      attackValue,
      healthValue,
      attackModifier,
      healthModifier,
      hasModifiers
    };
  }, [card, isFieldCard, fieldCard]);
}

// === 統合されたTooltip実装（tooltip-parts統合版） ===

const TooltipHeader = ({ card }: { card: Card }) => {
  const FactionIcon = FACTION_ICONS[card.faction];
  
  return (
    <div className="flex items-center gap-2 mb-3 border-b border-gray-600 pb-2">
      <FactionIcon 
        size={16} 
        className={`${FACTION_COLORS[card.faction].accent} drop-shadow-sm`} 
      />
      <div className="text-base font-bold text-white flex-1">《{card.name}》</div>
      <div className="flex items-center gap-1">
        <Zap size={16} className="text-blue-400 drop-shadow-sm" />
        <span className="text-blue-400 font-bold">{card.cost}</span>
      </div>
    </div>
  );
};

const TooltipCreatureStats = ({ card, isFieldCard, fieldCard }: { card: Card; isFieldCard: boolean; fieldCard: FieldCard | null }) => {
  const statsData = useCreatureStatsData(card, isFieldCard, fieldCard);

  if (card.type !== 'creature' || !statsData) return null;

  return (
    <div className="flex items-center gap-6 mb-3">
      <div className="flex items-center gap-1.5">
        <Sword size={16} className="text-red-400 drop-shadow-sm" />
        <span className={`font-semibold ${statsData.hasModifiers ? 'text-yellow-300 drop-shadow-sm' : 'text-white'}`}>
          {statsData.attackValue}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <Heart size={16} className="text-green-400 drop-shadow-sm" />
        <span className={`font-semibold ${statsData.hasModifiers ? 'text-yellow-300 drop-shadow-sm' : 'text-white'}`}>
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
    <div style={tooltipStyle} className="fixed transition-all duration-300 pointer-events-none z-50">
      <div className="px-4 py-3 bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white text-xs rounded-xl shadow-2xl w-96 text-left leading-relaxed border border-gray-500/50 backdrop-blur-sm">
        <TooltipHeader card={card} />
        <TooltipCreatureStats card={card} isFieldCard={isFieldCard} fieldCard={fieldCard} />
        <TooltipKeywords card={card} />
        <TooltipEffects card={card} />
        <TooltipFlavor card={card} />
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
      </div>
    </div>
  );
};
