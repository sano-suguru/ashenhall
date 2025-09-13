import type { SignificanceRules } from '../types/analysis-types';

export const DEFAULT_SIGNIFICANCE_RULES: SignificanceRules = {
  damageThresholds: {
    medium: 3,
    heavy: 5,
  },
  lifeThresholds: {
    critical: 5,
  },
  turnThresholds: {
    earlyGame: 5,
    endGame: 8,
  },
};

/**
 * 現在の重要性判定ルールを取得
 * バランス調整時はDEFAULT_SIGNIFICANCE_RULESを変更するだけ
 */
export const getCurrentRules = (): SignificanceRules => DEFAULT_SIGNIFICANCE_RULES;
