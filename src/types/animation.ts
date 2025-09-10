/**
 * Ashenhall 演出システム型定義
 * 
 * 設計方針:
 * - 演出完了まで実際の破壊を遅延
 * - 演出中状態の一元管理
 * - 速度調整との統合
 */

import type { FieldCard, PlayerId, GameState } from './game';

/** 演出中のカードアニメーション状態 */
export interface CardAnimation {
  /** アニメーション種別 */
  type: 'attacking' | 'being_attacked' | 'dying' | 'taking_damage';
  /** アニメーション開始時刻 */
  startTime: number;
  /** アニメーション継続時間（ms） */
  duration: number;
  /** 演出対象のカードID */
  cardId: string;
  /** カード所有者 */
  owner: PlayerId;
  /** ダメージ量（ダメージ演出の場合） */
  damageAmount?: number;
}

/** 破壊予定状態 */
export interface PendingDestruction {
  /** 破壊予定のカード */
  card: FieldCard;
  /** 破壊原因 */
  source: 'combat' | 'effect';
  /** 破壊原因のカードID */
  sourceCardId: string;
  /** 破壊実行予定時刻 */
  scheduledTime: number;
  /** 破壊関連の演出完了待ちフラグ */
  waitingForAnimation: boolean;
}

/** アニメーション状態管理 */
export interface AnimationState {
  /** 現在実行中のアニメーション */
  activeAnimations: CardAnimation[];
  /** 破壊予定のカード群 */
  pendingDestructions: PendingDestruction[];
  /** 最後の更新時刻 */
  lastUpdateTime: number;
}

/** 演出完了ベースのゲーム状態拡張 */
export interface GameStateWithAnimation {
  /** 基本ゲーム状態 */
  gameState: GameState;
  /** アニメーション管理 */
  animationState: AnimationState;
  /** 現在時刻（演出タイムライン管理用） */
  currentTime: number;
}

/** 演出時間定数 */
export const ANIMATION_DURATIONS = {
  /** 攻撃演出時間 */
  attack: 300,
  /** 被攻撃演出時間 */
  being_attacked: 400,
  /** ダメージポップアップ時間 */
  damage_popup: 1000,
  /** 破壊演出時間 */
  destruction: 800,
  /** 合計演出時間（最長） */
  total_combat: 1400,
} as const;

/** アクション別演出時間（useGameProgressのACTION_DELAYSと統合） */
export const ACTION_ANIMATION_DURATIONS = {
  card_play: 600,
  card_attack: ANIMATION_DURATIONS.total_combat,  // 統合
  creature_destroyed: ANIMATION_DURATIONS.destruction,
  effect_trigger: 400,
  keyword_trigger: 450,
  energy_update: 150,
  phase_change: 250,
  trigger_event: 100,
} as const;
