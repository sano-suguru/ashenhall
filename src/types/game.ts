/**
 * Ashenhall ゲームシステム型定義 - Barrel Export
 * 
 * 設計方針:
 * - 全ての型の一元的な再エクスポート
 * - 後方互換性の完全保持
 * - 型の発見性とメンテナンス性の向上
 */

// === 基本型（コア・識別子） ===
export type {
  PlayerId,
  Faction,
  GamePhase,
  CardType,
} from './core';

// === 効果システム型 ===
export type {
  Keyword,
  EffectTrigger,
  EffectAction,
  EffectTarget,
  ConditionSubject,
  ConditionOperator,
  StatusEffect
} from './effects';

// === カードシステム型 ===
export type {
  FilterRule,
  EffectCondition,
  ConditionalEffect,
  CardEffect,
  BaseCardTemplate,
  CreatureCardTemplate,
  SpellCardTemplate,
  CardTemplate,
  BaseCard,
  CreatureCard,
  SpellCard,
  Card,
  FieldCard,
  SpecialEffectHandler
} from './cards';

// === ゲーム状態型 ===
export type {
  PlayerState,
  ValueChange,
  CardPlayActionData,
  CardAttackActionData,
  CreatureDestroyedActionData,
  EffectTriggerActionData,
  PhaseChangeActionData,
  EnergyUpdateActionData,
  TriggerEventActionData,
  KeywordTriggerActionData,
  CombatStageActionData,
  CardDrawActionData,
  EnergyRefillActionData,
  EndStageActionData,
  GameAction,
  GameResult,
  GameState
} from './game-state';

// === 統計・分析型 ===
export type {
  CardMetrics,
  DeckAnalysis,
  FactionStats,
  LocalStats,
  BattleRequest,
  BattleMatch
} from './statistics';

// === UI・ユーティリティ型 ===
export type {
  LogDisplayParts,
  CustomDeck,
  DeckCollection,
  ArrayElement,
  Required,
  Exact
} from './ui-utils';

// === アニメーション型 ===
export type {
  CardAnimationKind,
  CardAnimationState
} from './animation';

export {
  ANIMATION_NONE,
  getAnimationCssClass,
  convertLegacyAnimationState,
  convertToLegacyAnimationState
} from './animation';

// === 定数の再エクスポート ===
export {
  GAME_CONSTANTS,
  BALANCE_GUIDELINES,
  FACTION_DESCRIPTIONS,
  AI_EVALUATION_WEIGHTS,
} from './constants';
