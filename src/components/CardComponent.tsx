/**
 * カードコンポーネント - 個別カードの表示
 * 
 * 設計方針:
 * - 場のカードと手札のカード両方で使用可能
 * - プレースホルダー画像で各勢力の特色表現
 * - レスポンシブ対応
 * - React Portalを使用してツールチップがoverflowに隠れないようにする
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Card, FieldCard, Faction } from '@/types/game';
import { 
  Skull, 
  Zap, 
  Sparkles, 
  Shield, 
  Eye,
  Bomb,
  Heart,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  Users,
  CreditCard,
  Sword,
  ScrollText, // for spell
  HeartHandshake, // for resurrect
  MicOff, // for silence
  Ban, // for stun
  Trash2, // for destroy
  Repeat, // for swap_attack_health
  FileX, // for hand_discard
  Flame, // for destroy_all_creatures
} from 'lucide-react';

interface CardComponentProps {
  card: Card;
  isFieldCard?: boolean;
  isOpponent?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

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

// カード効果アイコン
const EFFECT_ICONS = {
  damage: Bomb,
  heal: Heart,
  buff_attack: ArrowUp,
  buff_health: ShieldCheck,
  debuff_attack: ArrowDown,
  debuff_health: Skull,
  summon: Users,
  draw_card: CreditCard,
  guard: Shield,
  resurrect: HeartHandshake,
  silence: MicOff,
  stun: Ban,
  destroy_deck_top: Trash2,
  swap_attack_health: Repeat,
  hand_discard: FileX,
  destroy_all_creatures: Flame,
} as const;

// サイズ設定
const SIZE_CLASSES = {
  small: {
    container: 'w-20 h-28',
    text: 'text-xs',
    icon: 'text-lg',
    stats: 'text-xs',
  },
  medium: {
    container: 'w-28 h-40',
    text: 'text-sm',
    icon: 'text-xl',
    stats: 'text-sm',
  },
  large: {
    container: 'w-36 h-52',
    text: 'text-base',
    icon: 'text-2xl',
    stats: 'text-lg',
  },
} as const;

const Tooltip = ({ card, isFieldCard, fieldCard, tooltipStyle }: { card: Card, isFieldCard: boolean, fieldCard: FieldCard | null, tooltipStyle: React.CSSProperties }) => {
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

export default function CardComponent({
  card,
  isFieldCard = false,
  isOpponent = false,
  size = 'medium',
  className = '',
}: CardComponentProps) {
  const fieldCard = isFieldCard ? card as FieldCard : null;
  const factionStyle = FACTION_COLORS[card.faction];
  const sizeStyle = SIZE_CLASSES[size];
  
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({ opacity: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  const isDamaged = fieldCard && fieldCard.currentHealth < fieldCard.health;
  const isEnhanced = fieldCard && (fieldCard.attackModifier !== 0 || fieldCard.healthModifier !== 0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleMouseEnter = () => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const tooltipHeight = 300; // Approximate height of the tooltip
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;

      let top, transform;
      if (spaceAbove > tooltipHeight || spaceAbove > spaceBelow) {
        // Display above
        top = `${rect.top - 8}px`;
        transform = 'translateX(-50%) translateY(-100%)';
      } else {
        // Display below
        top = `${rect.bottom + 8}px`;
        transform = 'translateX(-50%)';
      }

      setTooltipStyle({
        position: 'fixed',
        top,
        left: `${rect.left + rect.width / 2}px`,
        transform,
        opacity: 1,
      });
    }
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setTooltipStyle(prev => ({ ...prev, opacity: 0 }));
    setShowTooltip(false);
  };

  return (
    <div
      ref={cardRef}
      className={`relative group ${sizeStyle.container} ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        className={`
          w-full h-full rounded-lg border-2 ${factionStyle.border}
          bg-gradient-to-b ${factionStyle.bg} text-white shadow-lg
          transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl
          ${isDamaged ? 'ring-2 ring-red-500' : ''}
          ${isEnhanced ? 'ring-2 ring-green-500' : ''}
          ${isOpponent ? 'opacity-90' : 'opacity-100'}
        `}
      >
        {/* ... card content ... */}
        <div className="absolute -top-2 -left-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white z-10">
          <span className="text-white text-xs font-bold">{card.cost}</span>
        </div>
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center border-2 border-white z-10">
          {(() => {
            const FactionIcon = FACTION_ICONS[card.faction];
            return <FactionIcon size={14} className="text-white" />;
          })()}
        </div>
        <div className="h-1/2 p-2 flex items-center justify-center">
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 rounded border border-gray-600 flex items-center justify-center">
            {(() => {
              const FactionIcon = FACTION_ICONS[card.faction];
              return <FactionIcon size={size === 'small' ? 20 : size === 'medium' ? 28 : 36} className={factionStyle.accent} />;
            })()}
          </div>
        </div>
        <div className="px-2 py-1">
          <h3 className={`${sizeStyle.text} font-bold text-center leading-tight`}>
            {card.name}
          </h3>
          <p className={`text-xs text-center ${factionStyle.accent} opacity-80`}>
            {CARD_TYPE_JP[card.type]}
          </p>
        </div>
        {card.effects.length > 0 && (
          <div className="px-2 flex justify-center space-x-1">
            {card.effects.slice(0, 3).map((effect, index) => {
              const EffectIcon = EFFECT_ICONS[effect.action] || Sparkles;
              return (
                <span
                  key={index}
                  className="text-xs"
                  title={`${effect.trigger}: ${effect.action} ${effect.value}`}
                >
                  <EffectIcon size={12} />
                </span>
              );
            })}
          </div>
        )}
        {card.type === 'creature' && (
          <div className="absolute bottom-2 left-2 right-2 flex justify-between">
            <div className="flex items-center space-x-1">
              <Sword size={12} className="text-orange-400" />
              <span className={`${sizeStyle.stats} font-bold ${isEnhanced && fieldCard?.attackModifier !== 0 ? 'text-green-400' : ''}`}>
                {isFieldCard && fieldCard ? (card.attack + fieldCard.attackModifier) : card.attack}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Heart size={12} className="text-red-400" />
              <span className={`${sizeStyle.stats} font-bold ${isDamaged ? 'text-red-400' : isEnhanced && fieldCard?.healthModifier !== 0 ? 'text-green-400' : ''}`}>
                {isFieldCard && fieldCard ? `${fieldCard.currentHealth}/${card.health + fieldCard.healthModifier}` : card.health}
              </span>
            </div>
          </div>
        )}
        {isFieldCard && fieldCard && (
          <div className="absolute top-2 left-2 text-xs text-gray-400">
            T{fieldCard.summonTurn}
          </div>
        )}
        {isEnhanced && (
          <div className="absolute inset-0 rounded-lg bg-green-400 opacity-20 animate-pulse pointer-events-none" />
        )}
        {isDamaged && (
          <div className="absolute inset-0 rounded-lg bg-red-600 opacity-30 pointer-events-none" />
        )}
      </div>

      {isMounted && showTooltip && createPortal(
        <Tooltip card={card} isFieldCard={isFieldCard} fieldCard={fieldCard} tooltipStyle={tooltipStyle} />,
        document.body
      )}
    </div>
  );
}
