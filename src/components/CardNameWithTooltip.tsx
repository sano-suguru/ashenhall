/**
 * カード名ツールチップコンポーネント
 * 
 * BattleLogModal等でカード名にホバーした際に
 * カード詳細情報をツールチップで表示
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCardTooltip } from '@/hooks/useCardTooltip';
import type { Card } from '@/types/game';
import { 
  Skull, 
  Zap, 
  Sparkles, 
  Shield, 
  Eye,
  Heart,
  Sword
} from 'lucide-react';

interface CardNameWithTooltipProps {
  cardId: string;
  children: React.ReactNode;
  className?: string;
  showBrackets?: boolean;
}

// 勢力アイコン
const FACTION_ICONS = {
  necromancer: Skull,
  berserker: Zap,
  mage: Sparkles,
  knight: Shield,
  inquisitor: Eye,
} as const;

// カードタイプ日本語名
const CARD_TYPE_JP = {
  creature: 'クリーチャー',
  spell: 'スペル',
};

// 勢力ごとの色設定
const FACTION_COLORS = {
  necromancer: {
    bg: 'from-purple-900 via-purple-800 to-black',
    border: 'border-purple-500',
    accent: 'text-purple-300',
  },
  berserker: {
    bg: 'from-red-900 via-red-800 to-orange-900',
    border: 'border-red-500',
    accent: 'text-red-300',
  },
  mage: {
    bg: 'from-blue-900 via-blue-800 to-purple-900',
    border: 'border-blue-500',
    accent: 'text-blue-300',
  },
  knight: {
    bg: 'from-yellow-900 via-yellow-800 to-amber-900',
    border: 'border-yellow-500',
    accent: 'text-yellow-300',
  },
  inquisitor: {
    bg: 'from-gray-900 via-gray-800 to-slate-900',
    border: 'border-gray-500',
    accent: 'text-gray-300',
  },
} as const;

export default function CardNameWithTooltip({
  cardId,
  children,
  className = '',
  showBrackets = false
}: CardNameWithTooltipProps) {
  const { card } = useCardTooltip(cardId);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({ opacity: 0 });
  const spanRef = useRef<HTMLSpanElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleMouseEnter = () => {
    if (spanRef.current) {
      const rect = spanRef.current.getBoundingClientRect();
      const tooltipHeight = 300; // Approximate height
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;

      let top, transform;
      if (spaceAbove > tooltipHeight || spaceAbove > spaceBelow) {
        top = `${rect.top - 8}px`;
        transform = 'translateX(-50%) translateY(-100%)';
      } else {
        top = `${rect.bottom + 8}px`;
        transform = 'translateX(-50%)';
      }

      setTooltipStyle({
        position: 'fixed',
        top,
        left: `${rect.left + rect.width / 2}px`,
        transform,
        opacity: 1,
        zIndex: 100, // Ensure it's on top
      });
    }
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setTooltipStyle(prev => ({ ...prev, opacity: 0 }));
    setShowTooltip(false);
  };

  if (!card) {
    // カードが見つからない場合は通常のテキストとして表示
    return <span className={className}>{children}</span>;
  }

  const factionStyle = FACTION_COLORS[card.faction];
  const FactionIcon = FACTION_ICONS[card.faction];

  return (
    <>
      <span
        ref={spanRef}
        className={`relative cursor-help ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {showBrackets ? `《${children}》` : children}
      </span>
      
      {isMounted && showTooltip && createPortal(
        <Tooltip card={card} tooltipStyle={tooltipStyle} />,
        document.body
      )}
    </>
  );
}

const Tooltip = ({ card, tooltipStyle }: { card: Card, tooltipStyle: React.CSSProperties }) => {
  const FactionIcon = FACTION_ICONS[card.faction];
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
              {card.attack}
            </div>
          </div>
          <div className="text-center">
            <div className="text-red-300 font-semibold flex items-center justify-center mb-1 text-xs">
              <Heart size={12} className="mr-1" />
              体力
            </div>
            <div className="text-base font-bold text-red-200">
              {card.health}
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-300 font-semibold mb-1 text-xs flex items-center justify-center">
              <FactionIcon size={12} className="mr-1" />
              勢力
            </div>
            <div className="text-xs text-gray-200">
              {card.faction === 'necromancer' && '死霊術師'}
              {card.faction === 'berserker' && '戦狂い'}
              {card.faction === 'mage' && '魔導士'}
              {card.faction === 'knight' && '騎士'}
              {card.faction === 'inquisitor' && '審問官'}
            </div>
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
                  <span className="text-purple-300 font-semibold">
                    {effect.trigger === 'on_play' && (card.type === 'creature' ? '召喚時' : '使用時')}
                    {effect.trigger === 'on_death' && '死亡時'}
                    {effect.trigger === 'turn_start' && 'ターン開始時'}
                    {effect.trigger === 'turn_end' && 'ターン終了時'}
                    {effect.trigger === 'passive' && '常時効果'}
                    {effect.trigger === 'on_spell_play' && '呪文使用時'}
                  </span>
                  <span className="text-gray-200 ml-2">
                    {effect.action === 'damage' && `${effect.value}ダメージを`}
                    {effect.action === 'heal' && `${effect.value}回復を`}
                    {effect.action === 'buff_attack' && `攻撃力+${effect.value}を`}
                    {effect.action === 'buff_health' && `体力+${effect.value}を`}
                    {effect.action === 'debuff_attack' && `攻撃力-${effect.value}を`}
                    {effect.action === 'debuff_health' && `体力-${effect.value}を`}
                    {effect.action === 'summon' && `トークン×${effect.value}を`}
                    {effect.action === 'draw_card' && `カード×${effect.value}を`}
                    {effect.action === 'resurrect' && `クリーチャー×${effect.value}を蘇生`}
                    {effect.action === 'silence' && `クリーチャー×${effect.value}を沈黙`}
                    {effect.target === 'self' && '自分に与える'}
                    {effect.target === 'ally_all' && '味方全体に与える'}
                    {effect.target === 'enemy_all' && '敵全体に与える'}
                    {effect.target === 'ally_random' && '味方ランダム1体に与える'}
                    {effect.target === 'enemy_random' && '敵ランダム1体に与える'}
                    {effect.target === 'player' && 'プレイヤーに与える'}
                  </span>
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
