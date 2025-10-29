import { Skull, Zap, Sparkles, Shield, Eye, Swords, Droplet } from 'lucide-react';

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

// 勢力ごとのホバー効果クラス設定（全カード用）
// ring: 縁グロー, shadow: 下方向影, drop-shadow: 全方向グロー
export const FACTION_HOVER_CLASSES = {
  necromancer:
    'group-hover:ring-2 group-hover:ring-purple-400/60 group-hover:shadow-purple-500/40 group-hover:shadow-2xl group-hover:drop-shadow-lg',
  berserker:
    'group-hover:ring-2 group-hover:ring-red-400/60 group-hover:shadow-red-500/40 group-hover:shadow-2xl group-hover:drop-shadow-lg',
  mage: 'group-hover:ring-2 group-hover:ring-blue-400/60 group-hover:shadow-blue-500/40 group-hover:shadow-2xl group-hover:drop-shadow-lg',
  knight:
    'group-hover:ring-2 group-hover:ring-yellow-400/60 group-hover:shadow-yellow-500/40 group-hover:shadow-2xl group-hover:drop-shadow-lg',
  inquisitor:
    'group-hover:ring-2 group-hover:ring-gray-300/60 group-hover:shadow-gray-400/40 group-hover:shadow-2xl group-hover:drop-shadow-lg',
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

// キーワード表示設定（シャドウバース風：アイコンのみ）
export const KEYWORD_ICONS = {
  guard: Shield,
  pierce: Swords,
  rush: Zap,
  lifesteal: Droplet,
} as const;

export const KEYWORD_LABELS: Record<string, string> = {
  guard: '守護',
  pierce: '貫通',
  rush: '速攻',
  lifesteal: '吸血',
} as const;

export const KEYWORD_COLORS: Record<string, string> = {
  guard: 'text-blue-400 bg-blue-900/80',
  pierce: 'text-red-400 bg-red-900/80',
  rush: 'text-yellow-400 bg-yellow-900/80',
  lifesteal: 'text-purple-400 bg-purple-900/80',
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
