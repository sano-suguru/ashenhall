/**
 * 効果の対象選択ロジック
 * 
 * 設計方針:
 * - 対象選択の責任のみを持つ
 * - ゲーム状態を変更しない（純粋関数）
 * - 決定論的な選択（同条件なら同結果）
 */

import type { GameState, FieldCard, PlayerId, EffectTarget } from "@/types/game";
import { SeededRandom } from "../seeded-random";

/**
 * 効果の対象を選択する
 * @param state ゲーム状態
 * @param sourcePlayerId 効果の発動者
 * @param targetType 対象タイプ
 * @param random 決定論的乱数生成器
 * @returns 選択された対象のリスト
 */
export function selectTargets(
  state: GameState,
  sourcePlayerId: PlayerId,
  targetType: EffectTarget,
  random: SeededRandom
): FieldCard[] {
  const sourcePlayer = state.players[sourcePlayerId];
  const opponentId: PlayerId =
    sourcePlayerId === "player1" ? "player2" : "player1";
  const opponent = state.players[opponentId];

  switch (targetType) {
    case "self":
      // 効果発動者自身は特別処理が必要（場にいない可能性）
      return [];

    case "ally_all":
      return [...sourcePlayer.field].filter((card) => card.currentHealth > 0);

    case "enemy_all":
      return [...opponent.field].filter(
        (card) => card.currentHealth > 0 && !card.keywords.includes('untargetable')
      );

    case "ally_random":
      const allyTargets = sourcePlayer.field.filter(
        (card) => card.currentHealth > 0
      );
      const randomAlly = random.choice(allyTargets);
      return randomAlly ? [randomAlly] : [];

    case "enemy_random":
      const enemyTargets = opponent.field.filter(
        (card) => card.currentHealth > 0 && !card.keywords.includes('untargetable')
      );
      const randomEnemy = random.choice(enemyTargets);
      return randomEnemy ? [randomEnemy] : [];

    case "player":
      // プレイヤー対象は別処理
      return [];

    default:
      return [];
  }
}

/**
 * 対象選択が有効かどうかを判定する
 * @param state ゲーム状態
 * @param sourcePlayerId 効果の発動者
 * @param targetType 対象タイプ
 * @returns 有効な対象が存在するかどうか
 */
export function hasValidTargets(
  state: GameState,
  sourcePlayerId: PlayerId,
  targetType: EffectTarget
): boolean {
  const sourcePlayer = state.players[sourcePlayerId];
  const opponentId: PlayerId =
    sourcePlayerId === "player1" ? "player2" : "player1";
  const opponent = state.players[opponentId];

  switch (targetType) {
    case "self":
      return true; // 自分自身は常に有効

    case "ally_all":
    case "ally_random":
      return sourcePlayer.field.some((card) => card.currentHealth > 0);

    case "enemy_all":
    case "enemy_random":
      return opponent.field.some(
        (card) => card.currentHealth > 0 && !card.keywords.includes('untargetable')
      );

    case "player":
      return true; // プレイヤー対象は常に有効

    default:
      return false;
  }
}
