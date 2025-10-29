import type { FieldCard } from '@/types/game';

/**
 * カード1枚への体力減算を一元化
 * 0 未満へ落とさない処理を保証
 *
 * @param card 対象のフィールドカード
 * @param amount ダメージ量
 */
export function applyDamageToCard(card: FieldCard, amount: number): void {
  if (amount <= 0) return;
  card.currentHealth = Math.max(0, card.currentHealth - amount);
}
