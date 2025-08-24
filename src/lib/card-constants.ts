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
  HeartHandshake,
  MicOff,
  Ban,
  Trash2,
  Repeat,
  FileX,
  Flame,
  RotateCw,
} from 'lucide-react';

// 勢力ごとの色設定
export const FACTION_COLORS = {
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
export const FACTION_ICONS = {
  necromancer: Skull,
  berserker: Zap,
  mage: Sparkles,
  knight: Shield,
  inquisitor: Eye,
} as const;

// カードタイプ日本語名
export const CARD_TYPE_JP = {
  creature: 'クリーチャー',
  spell: 'スペル',
};

// カード効果アイコン
export const EFFECT_ICONS = {
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
  ready: RotateCw,
} as const;

// サイズ設定
export const SIZE_CLASSES = {
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
