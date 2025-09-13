/**
 * Ashenhall 演出システム型定義（簡素化版）
 * 
 * 設計方針:
 * - GameActionベース演出システム用
 * - 必要最小限の型のみ保持
 */

/** アクション別演出時間（useGameProgress用） */
export const ACTION_ANIMATION_DURATIONS = {
  card_play: 600,
  card_attack: 1400,  // 攻撃演出時間
  creature_destroyed: 800,
  effect_trigger: 400,
  keyword_trigger: 450,
  energy_update: 150,
  phase_change: 250,
  trigger_event: 100,
} as const;
