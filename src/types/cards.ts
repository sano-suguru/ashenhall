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
  Faction
} from './core';

import type {
  Keyword,
  EffectTrigger,
  EffectAction,
  EffectTarget,
  ConditionSubject,
  ConditionOperator,
  StatusEffect
} from './effects';

// === カード効果システム ===

/** フィルタールール（統一インターフェース） */
export interface FilterRule {
  type: 'brand' | 'property' | 'cost' | 'keyword' | 'health' | 'exclude_self' | 'card_type' | 'faction';
  operator: 'eq' | 'gte' | 'lte' | 'has' | 'not_has' | 'range';
  value?: string | number | boolean | Keyword | { property: string; expectedValue: unknown };
  minValue?: number;
  maxValue?: number;
}

/** 効果発動条件 */
export interface EffectCondition {
  subject: ConditionSubject;
  operator: ConditionOperator;
  value: number | 'opponentLife';
}

/** 条件分岐効果定義 */
export interface ConditionalEffect {
  /** 分岐条件 */
  condition: EffectCondition;
  /** 条件が真の場合に実行する効果 */
  ifTrue: CardEffect[];
  /** 条件が偽の場合に実行する効果 */
  ifFalse: CardEffect[];
}

/** 動的値計算記述子 */
export interface DynamicValueDescriptor {
  source: 'graveyard' | 'field' | 'enemy_field';
  filter?: 'creatures' | 'alive' | 'exclude_self' | 'has_brand';
  baseValue?: number;
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
  /** 動的値計算（新機能） - DYNAMIC_VALUE_CONFIGSの置き換え */
  dynamicValue?: DynamicValueDescriptor;
  /** 効果発動条件（オプション） - ゲーム状態を見て「この効果を発動するか」を判定 */
  activationCondition?: EffectCondition;
  /** 対象選択ルール - FilterRule[]形式 */
  selectionRules?: FilterRule[];
  /** 特殊効果ハンドラー名（拡張機能） - 段階的廃止予定 */
  specialHandler?: string;
  /** 条件分岐効果（新機能） - specialHandlerの汎用化版 */
  conditionalEffect?: ConditionalEffect;
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
  /** カードをプレイするための条件（空打ち防止用） */
  playConditions?: EffectCondition[];
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
