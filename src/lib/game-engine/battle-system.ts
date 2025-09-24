/**
 * Ashenhall 戦闘システム
 * 
 * 設計方針:
 * - 戦闘フェーズの処理を細分化
 * - キーワード効果の統一的な処理
 * - 決定論的な戦闘計算
 */

import type { GameState } from "@/types/game";
import { advancePhase } from "./game-state";
import { applyPassiveEffects } from "./card-effects";


/**
 * 守護クリーチャーを検出
 */
// 旧一括解決用の守護再ターゲット処理は BattleIterator 側ステージ化で不要になったため削除

/**
 * Lifesteal (吸血) 効果の処理
 */
// 各種キーワード処理も戦闘サブステージへ移行済み（旧ロジック削除）

/**
 * Poison (毒) 効果の処理
 */

/**
 * Trample (貫通) 効果の処理
 */

/**
 * キーワード効果の処理（統合版）
 */
// processKeywordEffects も削除（段階的解決へ移行）


/**
 * 戦闘フェーズの処理（battle_attackフェーズへの移行）
 */
export function processBattlePhase(state: GameState): void {
  applyPassiveEffects(state);
  
  // battle_attack フェーズに直接移行（リスト作成不要）
  state.phase = 'battle_attack';
}

/**
 * 攻撃フェーズの処理（動的攻撃者チェック）
 */
export function processAttackPhase(state: GameState): void {
  // BattleIterator 主体に移行後はここでフェーズ終了条件のみ判定
  if (state.players.player1.life <= 0 || state.players.player2.life <= 0) {
    advancePhase(state);
    return;
  }
  const currentPlayer = state.players[state.currentPlayer];
  const hasAttacker = currentPlayer.field.some(card =>
    card.currentHealth > 0 &&
    ((!card.isSilenced && card.keywords.includes("rush")) || card.summonTurn < state.turnNumber) &&
    !card.hasAttacked &&
    !card.statusEffects.some(e => e.type === 'stun')
  );
  if (!hasAttacker) {
    advancePhase(state);
  }
}

/**
 * 個別攻撃者の処理（シンプル版）
 */
// 個別攻撃処理は BattleIterator のサブステージ進行へ移行済み

/**
 * 戦闘ダメージの処理（演出統合版）
 */
// 旧一括戦闘ダメージ処理削除（CardAttackAction 生成は Iterator 側）
