import type { FieldCard } from '@/types/game';

// 体力減算を一元化し 0 未満へ落とさない
export function applyDamage(card: FieldCard, amount: number): void {
  if (amount <= 0) return;
  card.currentHealth = Math.max(0, card.currentHealth - amount);
}
