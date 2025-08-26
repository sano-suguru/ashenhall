'use client';

import React from 'react';
import type { Card, FieldCard } from '@/types/game';
import { FACTION_ICONS } from '@/lib/card-constants';
import { Sword, Heart } from 'lucide-react';
import { useCreatureStatsData } from '@/hooks/useCreatureStatsData';
import { ModifierText } from './ModifierText';

interface TooltipCreatureStatsProps {
  card: Card;
  isFieldCard: boolean;
  fieldCard: FieldCard | null;
}

const StatDisplay = ({ title, value, icon: Icon, colorClass }: { title: string, value: React.ReactNode, icon: React.ElementType, colorClass: string }) => (
  <div className="text-center">
    <div className={`${colorClass} font-semibold flex items-center justify-center mb-1 text-xs`}>
      <Icon size={12} className="mr-1" />
      {title}
    </div>
    <div className={`text-base font-bold ${colorClass.replace('text-', 'text-')}`}>
      {value}
    </div>
  </div>
);

const FactionDisplay = ({ card }: { card: Card }) => {
  const FactionIcon = FACTION_ICONS[card.faction];
  const factionName = {
    necromancer: '死霊術師',
    berserker: '戦狂い',
    mage: '魔導士',
    knight: '騎士',
    inquisitor: '審問官',
  }[card.faction];

  return (
    <div className="text-center">
      <div className="text-gray-300 font-semibold mb-1 text-xs flex items-center justify-center">
        <FactionIcon size={12} className="mr-1" />
        勢力
      </div>
      <div className="text-xs text-gray-200">{factionName}</div>
    </div>
  );
};

const FieldStatusDisplay = ({ fieldCard }: { fieldCard: FieldCard }) => (
  <div className="text-center">
    <div className="text-gray-300 font-semibold mb-1 text-xs">場の状態</div>
    <div className="text-xs text-gray-200">
      ターン{fieldCard.summonTurn}<br/>位置{fieldCard.position + 1}
    </div>
  </div>
);

export const TooltipCreatureStats = ({ card, isFieldCard, fieldCard }: TooltipCreatureStatsProps) => {
  const statsData = useCreatureStatsData(card, isFieldCard, fieldCard);
  
  if (!statsData) {
    return null;
  }
  
  return (
    <div className="grid grid-cols-3 gap-3 mb-2">
      <StatDisplay 
        title="攻撃力" 
        value={
          <>
            {statsData.attackValue}
            <ModifierText modifier={statsData.attackModifier} size="sm" />
          </>
        } 
        icon={Sword} 
        colorClass="text-orange-300" 
      />
      <StatDisplay 
        title="体力" 
        value={
          <>
            {statsData.healthValue}
            <ModifierText modifier={statsData.healthModifier} size="xs" />
          </>
        } 
        icon={Heart} 
        colorClass="text-red-300" 
      />
      {isFieldCard && fieldCard ? 
        <FieldStatusDisplay fieldCard={fieldCard} /> : 
        <FactionDisplay card={card} />
      }
    </div>
  );
};
