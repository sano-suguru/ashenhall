import { 
  Skull, 
  Zap, 
  Sparkles, 
  Shield, 
  Eye,
  Sword,
  ShieldCheck,
  Gauge,
  Scale,
} from 'lucide-react';
import { FACTION_DESCRIPTIONS } from '@/types/game';

// 勢力の表示データ
export const FACTION_DATA = {
  necromancer: {
    name: '死霊術師',
    color: 'from-purple-950 to-gray-950',
    icon: Skull,
    description: FACTION_DESCRIPTIONS.necromancer,
  },
  berserker: {
    name: '戦狂い',
    color: 'from-red-950 to-stone-950',
    icon: Zap,
    description: FACTION_DESCRIPTIONS.berserker,
  },
  mage: {
    name: '魔導士',
    color: 'from-indigo-950 to-slate-950',
    icon: Sparkles,
    description: FACTION_DESCRIPTIONS.mage,
  },
  knight: {
    name: '騎士',
    color: 'from-amber-950 to-stone-950',
    icon: Shield,
    description: FACTION_DESCRIPTIONS.knight,
  },
  inquisitor: {
    name: '審問官',
    color: 'from-slate-950 to-zinc-950',
    icon: Eye,
    description: FACTION_DESCRIPTIONS.inquisitor,
  },
} as const;

// 戦術タイプの説明
export const TACTICS_DATA = {
  aggressive: {
    name: '攻撃重視',
    description: '攻撃力の高いカードを優先配置。短期決戦で敵を圧倒する戦術。',
    icon: Sword,
  },
  defensive: {
    name: '守備重視',
    description: '体力・防御効果の高いカードを優先。持久戦に持ち込む安定戦術。',
    icon: ShieldCheck,
  },
  tempo: {
    name: '速攻重視',
    description: '低コストカードで早期展開。素早い攻勢で優位に立つ戦術。',
    icon: Gauge,
  },
  balanced: {
    name: 'バランス',
    description: 'コスト効率を重視したバランス型。状況に応じて柔軟に対応する戦術。',
    icon: Scale,
  },
} as const;

// 選択カードの共通スタイル
export const getSelectionCardStyle = (isSelected: boolean) => `
  relative cursor-pointer p-6 rounded-2xl border transition-all duration-300 group hover:scale-[1.02] backdrop-blur-sm
  ${isSelected 
    ? 'border-amber-400/60 bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-transparent shadow-2xl shadow-amber-400/25' 
    : 'border-white/15 hover:border-amber-300/40 bg-gradient-to-br from-white/8 via-white/4 to-transparent hover:shadow-2xl hover:shadow-white/10'
  }
`;

export type FactionDataType = typeof FACTION_DATA;
export type TacticsDataType = typeof TACTICS_DATA;
