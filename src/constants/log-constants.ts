/**
 * ログ関連の定数定義
 *
 * 設計方針:
 * - UIコンポーネント、テストスクリプトなど複数箇所で使用される定数を一元管理
 * - DRY原則に基づき、重複定義を排除
 */

import type { GameAction } from '@/types/game';

/**
 * 内部処理ログのアクションタイプ
 * ユーザー向け表示では除外され、デバッグ目的でのみ使用される
 *
 * @example
 * ```typescript
 * const userVisibleActions = actions.filter(
 *   action => !INTERNAL_LOG_TYPES.includes(action.type)
 * );
 * ```
 */
export const INTERNAL_LOG_TYPES: GameAction['type'][] = [
  'combat_stage', // 戦闘サブステージ（card_attackで十分）
  'end_stage', // 終了ステージ処理（結果は他ログで表現）
  'energy_update', // エネルギー上限更新（energy_refillで十分）
  'trigger_event', // トリガーイベント（effect_triggerで十分）
];
