/**
 * アニメーション持続時間の中央定義
 * 単位: ミリ秒
 * UI（CSS）とロジック（TS）で一致させるための真実のソース
 */
export const AnimationDurations = {
  ATTACK: 300,
  DAMAGE: 1000,
  DESTROY: 1000,
} as const;

export type AnimationPhase = keyof typeof AnimationDurations;

export function getDurationForPhaseMs(phase: AnimationPhase): number {
  return AnimationDurations[phase];
}

export default AnimationDurations;
