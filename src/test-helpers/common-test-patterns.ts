/**
 * 共通テストパターンのヘルパー関数
 * 
 * 設計方針: 
 * - 重複テストコードの削除
 * - 個人開発でのテストメンテナンス負荷軽減
 * - 一貫性のあるテストパターン提供
 */

import { processGameStep } from '@/lib/game-engine/core';
import type { GameState } from '@/types/game';

/**
 * 戦闘フェーズ完了まで進める共通パターン
 * テストの78箇所で使用されている重複コードを統一
 */
export function processBattlePhaseComplete(gameState: GameState): GameState {
  // battle → battle_attack への移行
  let currentState = processGameStep(gameState);
  
  // battle_attack フェーズが完了するまで実行
  while (currentState.phase === 'battle_attack' && !currentState.result) {
    currentState = processGameStep(currentState);
  }
  
  return currentState;
}

/**
 * 指定ターンまでゲームを進める共通パターン
 * maxStepsで無限ループ防止（個人開発での安全性重視）
 */
export function advanceGameToTurn(
  gameState: GameState, 
  targetTurn: number,
  maxSteps: number = 1000
): GameState {
  let currentState = gameState;
  let steps = 0;
  
  while (currentState.turnNumber < targetTurn && !currentState.result && steps < maxSteps) {
    currentState = processGameStep(currentState);
    steps++;
  }
  
  if (steps >= maxSteps) {
    throw new Error(`ゲーム進行が${maxSteps}ステップでタイムアウト`);
  }
  
  return currentState;
}

/**
 * guardキーワード持ちテストカード作成パターン
 * 複数テストファイルで重複していた共通処理
 */
export function createGuardTestCard(
  id: string = 'test-guard-card',
  attack: number = 2,
  health: number = 3,
  cost: number = 2
) {
  return {
    id,
    name: 'テスト守護者',
    type: 'creature' as const,
    faction: 'knight' as const,
    cost,
    attack, 
    health,
    keywords: ['guard'] as const,
    effects: [],
    flavor: 'テスト用の守護キーワード持ちクリーチャー',
  };
}

/**
 * 戦闘シミュレーション実行の共通パターン
 * battle-test-helpersとの重複を避けつつ、簡易版を提供
 */
export function runQuickBattleSimulation(
  gameState: GameState,
  maxTurns: number = 15
): GameState {
  let currentState = gameState;
  
  while (!currentState.result && currentState.turnNumber <= maxTurns) {
    currentState = processGameStep(currentState);
  }
  
  return currentState;
}

/**
 * テスト期待値の共通アサーション
 * 個人開発でよく使う基本チェックパターン
 */
export function assertGameStateValid(gameState: GameState): void {
  // 基本的な整合性チェック
  expect(gameState.turnNumber).toBeGreaterThanOrEqual(1);
  expect(gameState.currentPlayer).toMatch(/^player[12]$/);
  expect(['draw', 'energy', 'deploy', 'battle', 'battle_attack', 'end']).toContain(gameState.phase);
  
  // プレイヤー状態の基本チェック
  Object.values(gameState.players).forEach(player => {
    expect(player.life).toBeGreaterThanOrEqual(0);
    expect(player.energy).toBeGreaterThanOrEqual(0);
    expect(player.energy).toBeLessThanOrEqual(player.maxEnergy);
    expect(player.field.length).toBeLessThanOrEqual(5);
    expect(player.hand.length).toBeLessThanOrEqual(7);
  });
}
