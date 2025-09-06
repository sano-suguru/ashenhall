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
  TacticsType,
  GamePhase,
  CardType,
  CardProperty
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
  TargetFilter,
  EffectCondition,
  ConditionalEffect,
  CardEffect,
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

// === 定数の再エクスポート ===
export {
  GAME_CONSTANTS,
  BALANCE_GUIDELINES,
  TACTICS_ATTACK_PROBABILITIES,
  FACTION_DESCRIPTIONS,
  AI_EVALUATION_WEIGHTS
} from './constants';
