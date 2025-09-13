import type { DamageAnalysis, SignificanceRules } from '../types/analysis-types';

/**
 * ダメージ分析を行う（複雑度: 4）
 * @param player1Damage プレイヤー1が受けたダメージ
 * @param player2Damage プレイヤー2が受けたダメージ
 * @param rules 判定基準ルール
 * @returns ダメージ分析結果
 */
export function analyzeDamage(
  player1Damage: number,
  player2Damage: number,
  rules: SignificanceRules
): DamageAnalysis {
  const maxDamage = Math.max(player1Damage, player2Damage);
  
  let damageCategory: 'none' | 'light' | 'medium' | 'heavy';
  if (maxDamage >= rules.damageThresholds.heavy) {
    damageCategory = 'heavy';
  } else if (maxDamage >= rules.damageThresholds.medium) {
    damageCategory = 'medium';
  } else if (maxDamage > 0) {
    damageCategory = 'light';
  } else {
    damageCategory = 'none';
  }

  return {
    player1Damage,
    player2Damage,
    damageCategory,
  };
}
