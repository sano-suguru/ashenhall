/**
 * Ashenhall カードシステム型定義
 * 
 * 設計方針:
 * - カードの基本構造とエフェクトシステム
 * - ゲーム中のカード状態管理
 * - カード効果の詳細設定
 */

import type {
  PlayerId,
  Faction,
  CardType,
  CardProperty
} from './core';

import type {
  Keyword,
  EffectTrigger,
  EffectAction,
  EffectTarget,
  DynamicValueType,
  ConditionSubject,
  ConditionOperator,
  StatusEffect
} from './effects';

// === カード効果システム ===

/** 動的値計算設定 */
export interface DynamicValue {
  type: DynamicValueType;
  base?: number;      // 基準値（デフォルト0）
  multiplier?: number; // 乗数（デフォルト1）
  max?: number;       // 上限値
}

/** 対象フィルター */
export interface TargetFilter {
  // 既存フォーマット（後方互換性）
  property?: CardProperty;
  value?: 'spell' | 'creature' | number | Faction;
  // 新フォーマット（拡張機能）
  exclude_self?: boolean;    // 自分自身を除外
  min_health?: number;       // 最小体力
  max_health?: number;       // 最大体力
  has_keyword?: Keyword;     // 指定キーワード所持
  card_type?: CardType;      // カード種別
  min_cost?: number;         // 最小コスト
  max_cost?: number;         // 最大コスト
  has_faction?: Faction;     // 指定勢力所持（デッキサーチ用）
  hasBrand?: boolean;        // 烙印を持つクリーチャー（審問官効果用）
}

/** 拡張対象選択（フィルター機能付き） */
export interface EnhancedEffectTarget {
  base: EffectTarget;
  filters?: TargetFilter;
}

/** 効果発動条件 */
export interface EffectCondition {
  subject: ConditionSubject;
  operator: ConditionOperator;
  value: number | 'opponentLife';
}

/** カード効果インターフェース */
export interface CardEffect {
  /** 発動タイミング */
  trigger: EffectTrigger;
  /** 対象選択 */
  target: EffectTarget;
  /** 実行アクション */
  action: EffectAction;
  /** 効果値（ダメージ量、回復量等） */
  value: number;
  /** 効果発動条件（オプション） - ゲーム状態を見て「この効果を発動するか」を判定 */
  activationCondition?: EffectCondition;
  /** 対象選択フィルター（オプション） - 対象候補から「誰を実際の対象にするか」を絞り込み */
  selectionFilter?: TargetFilter;
  /** 動的値計算（拡張機能） */
  dynamicValue?: DynamicValue;
  /** 拡張対象選択（拡張機能） */
  enhancedTarget?: EnhancedEffectTarget;
  /** 特殊効果ハンドラー名（拡張機能） */
  specialHandler?: string;
  
  // === 後方互換性 ===
  /** @deprecated activationConditionを使用してください */
  condition?: EffectCondition;
  /** @deprecated selectionFilterを使用してください */
  targetFilter?: TargetFilter;
}

// === カード定義 ===

/** 全カード共通の基本情報 */
export interface BaseCard {
  id: string;
  name: string;
  faction: Faction;
  cost: number;
  keywords: Keyword[];
  effects: CardEffect[];
  flavor?: string;
}

/** クリーチャーカード情報 */
export interface CreatureCard extends BaseCard {
  type: 'creature';
  attack: number;
  health: number;
}

/** スペルカード情報 */
export interface SpellCard extends BaseCard {
  type: 'spell';
}

/** カード情報（クリーチャーまたはスペル） */
export type Card = CreatureCard | SpellCard;

/** 場のクリーチャーカード（戦闘中の状態を含む） */
export interface FieldCard extends CreatureCard {
  /** カードの所有者 */
  owner: PlayerId;
  /** 現在の体力 */
  currentHealth: number;
  /** 攻撃力バフ・デバフ（永続効果） */
  attackModifier: number;
  /** 体力バフ・デバフ（永続効果） */
  healthModifier: number;
  /** パッシブ効果による攻撃力修正 */
  passiveAttackModifier: number;
  /** パッシブ効果による体力修正 */
  passiveHealthModifier: number;
  /** 召喚されたターン */
  summonTurn: number;
  /** 場での位置（左から0-4） */
  position: number;
  /** このターンに攻撃したか */
  hasAttacked: boolean;
  /** 潜伏状態か */
  isStealthed: boolean;
  /** 沈黙状態か */
  isSilenced: boolean;
  /** 状態異常リスト */
  statusEffects: StatusEffect[];
  /** このターンに再攻撃準備効果が発動したか */
  readiedThisTurn: boolean;
}

// === 特殊効果ハンドラー ===

/** 特殊効果ハンドラーの型 */
export type SpecialEffectHandler<TGameState = unknown> = (
  state: TGameState,
  effect: CardEffect,
  sourceCard: Card,
  sourcePlayerId: PlayerId,
  targets: FieldCard[],
  calculatedValue: number,
  random: { choice: <T>(array: T[]) => T | undefined; next: () => number }
) => void;
