'use client';

import React from 'react';
import type { Card, FieldCard } from '@/types/game';
import { getEffectText, KEYWORD_DEFINITIONS } from '@/lib/card-text-utils';
import { CARD_TYPE_JP, FACTION_ICONS } from '@/lib/card-constants';
import { Sword, Heart, Sparkles, Star } from 'lucide-react';

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
        <div className="flex justify-between items-center mb-2 border-b border-gray-600 pb-2">
          <div className="font-bold text-base text-amber-200">{card.name}</div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">
              {CARD_TYPE_JP[card.type] || card.type}
            </span>
            <div className="text-blue-300 font-bold text-xs bg-blue-900 px-2 py-1 rounded">
              コスト {card.cost}
            </div>
          </div>
        </div>
        {card.type === 'creature' && (
        <div className="grid grid-cols-3 gap-3 mb-2">
          <div className="text-center">
            <div className="text-orange-300 font-semibold flex items-center justify-center mb-1 text-xs">
              <Sword size={12} className="mr-1" />
              攻撃力
            </div>
            <div className="text-base font-bold text-orange-200">
              {card.type === 'creature' && (isFieldCard && fieldCard ? (card.attack + fieldCard.attackModifier) : card.attack)}
              {card.type === 'creature' && isFieldCard && fieldCard && fieldCard.attackModifier !== 0 && (
                <span className="text-green-400 text-sm ml-1">
                  ({fieldCard.attackModifier > 0 ? '+' : ''}{fieldCard.attackModifier})
                </span>
              )}
            </div>
          </div>
          <div className="text-center">
            <div className="text-red-300 font-semibold flex items-center justify-center mb-1 text-xs">
              <Heart size={12} className="mr-1" />
              体力
            </div>
            <div className="text-base font-bold text-red-200">
              {card.type === 'creature' && (isFieldCard && fieldCard ? `${fieldCard.currentHealth}/${card.health + fieldCard.healthModifier}` : card.health)}
              {card.type === 'creature' && isFieldCard && fieldCard && fieldCard.healthModifier !== 0 && (
                <span className="text-green-400 text-xs ml-1">
                  ({fieldCard.healthModifier > 0 ? '+' : ''}{fieldCard.healthModifier})
                </span>
              )}
            </div>
          </div>
          <div className="text-center">
            {isFieldCard && fieldCard ? (
              <>
                <div className="text-gray-300 font-semibold mb-1 text-xs">場の状態</div>
                <div className="text-xs text-gray-200">
                  ターン{fieldCard.summonTurn}<br/>位置{fieldCard.position + 1}
                </div>
              </>
            ) : (
              <>
                <div className="text-gray-300 font-semibold mb-1 text-xs flex items-center justify-center">
                  {(() => {
                    const FactionIcon = FACTION_ICONS[card.faction];
                    return <FactionIcon size={12} className="mr-1" />;
                  })()}
                  勢力
                </div>
                <div className="text-xs text-gray-200">
                  {card.faction === 'necromancer' && '死霊術師'}
                  {card.faction === 'berserker' && '戦狂い'}
                  {card.faction === 'mage' && '魔導士'}
                  {card.faction === 'knight' && '騎士'}
                  {card.faction === 'inquisitor' && '審問官'}
                </div>
              </>
            )}
          </div>
        </div>
        )}
        {card.keywords.length > 0 && (
          <div className="mb-2">
            <div className="text-yellow-300 font-semibold mb-1 flex items-center text-xs">
              <Star size={12} className="mr-1" />
              能力
            </div>
            <div className="grid grid-cols-1 gap-1">
              {card.keywords.map((keyword) => (
                <div key={keyword} className="bg-gray-800 bg-opacity-50 px-2 py-1 rounded text-xs">
                  <span className="font-bold">{KEYWORD_DEFINITIONS[keyword]?.name || keyword}:</span>
                  <span className="ml-1">{KEYWORD_DEFINITIONS[keyword]?.description || '効果の説明がありません'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {card.effects.length > 0 && (
          <div className="mb-2">
            <div className="text-purple-300 font-semibold mb-1 flex items-center text-xs">
              <Sparkles size={12} className="mr-1" />
              効果
            </div>
            <div className="grid grid-cols-1 gap-1">
              {card.effects.map((effect, index) => (
                <div key={index} className="bg-gray-800 bg-opacity-50 px-2 py-1 rounded text-xs">
                  {getEffectText(effect, card.type)}
                </div>
              ))}
            </div>
          </div>
        )}
        {card.flavor && (
          <div className="border-t border-gray-600 pt-2">
            <div className="text-gray-400 italic text-xs leading-relaxed text-center">
              &ldquo;{card.flavor}&rdquo;
            </div>
          </div>
        )}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
      </div>
    </div>
  );
};
