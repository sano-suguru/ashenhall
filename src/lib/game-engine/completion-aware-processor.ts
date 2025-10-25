/**
 * 完了待機シーケンシャルプロセッサー
 * 
 * 設計方針:
 * - 論理処理完了 → 演出処理開始 → 演出完了 → 次処理開始の厳格な順序制御
 * - 並行実行の完全排除
 * - Promise ベースの完了待機システム
 * - 個人開発の保守性重視
 */

import type { GameState, GameAction } from '@/types/game';
import { processGameStep } from './core';
import { createBattleIterator, type BattleIterator } from './battle-iterator';
import { buildAnimationTasksFromActions, type AnimationTask } from '@/lib/animation/animation-tasks';


/**
 * アニメーション設定
 */
export interface AnimationState {
  isAnimating: boolean;
  animationType: 'attack' | 'damage' | 'destroy' | 'summon' | 'draw' | 'spell_cast' | 'heal' | 'none';
  sourceCardId: string | undefined;
  targetCardId: string | undefined;
  value?: number; // ダメージ量・回復量など
  destroySnapshot?: {
    id: string;
    owner: string;
    name: string;
    attackTotal: number;
    healthTotal: number;
    currentHealth: number;
    baseAttack: number;
    baseHealth: number;
    keywords: string[];
  };
}


/**
 * 完了待機シーケンシャルプロセッサー
 */
export class CompletionAwareProcessor {
  private isProcessing: boolean = false;
  private gameSpeed: number = 1.0;
  // アクション逐次処理用キュー
  private pendingActionQueue: GameAction[] = [];
  private pendingTaskQueue: AnimationTask[] = [];
  private activeBattleIterator: BattleIterator | null = null;
  
  // 自律的スケジューリング管理（循環参照解消の核心）
  private schedulerRef: NodeJS.Timeout | null = null;
  private autonomousConfig: {
    gameState: GameState | null;
    onStateChange: (newState: GameState) => void;
    onGameFinished?: () => void;
    onStatsUpdate?: (gameState: GameState) => void;
    onAnimationStateChange?: (state: AnimationState) => void;
    onError?: (error: Error) => void;
    isPlaying: boolean;
    currentTurn: number;
  } | null = null;

  /**
   * ゲーム速度の設定
   */
  setGameSpeed(speed: number): void {
    this.gameSpeed = speed;
  }

  /**
   * 現在処理中かどうか
   */
  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }


  /**
   * ゲーム進行ステップの作成（簡略化）
   */
  createGameProgressStep(
    gameState: GameState,
    onStateChange: (newState: GameState) => void
  ): { logicHandler: () => GameState } {
    return {
      logicHandler: () => {
        const nextState = processGameStep(gameState);
        onStateChange(nextState);
        return nextState;
      },
    };
  }



  /**
   * 自律的スケジューリング：次の処理をスケジュール（循環参照解消）
   */
  private scheduleNextProcessing(delay: number): void {
    if (this.schedulerRef) {
      clearTimeout(this.schedulerRef);
    }
    
    this.schedulerRef = setTimeout(() => {
      this.executeAutonomousStep();
    }, delay);
  }

  /**
   * スケジュールされた処理のキャンセル
   */
  cancelScheduledProcessing(): void {
    if (this.schedulerRef) {
      clearTimeout(this.schedulerRef);
      this.schedulerRef = null;
    }
  }

  /**
   * 自律的ゲーム進行設定の更新
   */
  updateAutonomousConfig(config: {
    gameState: GameState | null;
    isPlaying: boolean;
    currentTurn: number;
    gameSpeed: number;
    onStateChange: (newState: GameState) => void;
    onGameFinished?: () => void;
    onStatsUpdate?: (gameState: GameState) => void;
    onAnimationStateChange?: (state: AnimationState) => void;
    onError?: (error: Error) => void;
  }): void {
    this.autonomousConfig = {
      gameState: config.gameState,
      onStateChange: config.onStateChange,
      onGameFinished: config.onGameFinished,
      onStatsUpdate: config.onStatsUpdate,
      onAnimationStateChange: config.onAnimationStateChange,
      onError: config.onError,
      isPlaying: config.isPlaying,
      currentTurn: config.currentTurn,
    };
    this.gameSpeed = config.gameSpeed;
  }

  /**
   * 自律的ゲーム進行開始
   */
  startAutonomousGameProcessing(): void {
    if (!this.autonomousConfig?.isPlaying || !this.autonomousConfig?.gameState) {
      return;
    }

    // 初回実行
    this.scheduleNextProcessing(50);
  }

  /**
   * 自律的ゲーム進行停止
   */
  stopAutonomousGameProcessing(): void {
    this.cancelScheduledProcessing();
  }

  /**
   * 自律的実行可否の判定（バリデーション統合）
   */
  private canExecuteAutonomousStep(): boolean {
    const config = this.autonomousConfig;
    
    if (!config?.isPlaying || !config?.gameState || config.gameState.result) {
      return false;
    }
    
    if (config.currentTurn !== -1 && config.currentTurn < config.gameState.turnNumber) {
      return false;
    }
    
    return !this.isProcessing;
  }

  /**
   * ゲームステップ実行とアニメーション処理
   */
  private async executeGameStepWithAnimation(config: NonNullable<typeof this.autonomousConfig>): Promise<void> {
    // battle_attack フェーズでは常に BattleIterator でアクション単位進行
    if (config.gameState?.phase === 'battle_attack') {
      const produced = this.executeIteratorAction(config);
      if (produced) {
        // 生成された1アクション分のアニメーションを再生
        if (this.pendingActionQueue.length > 0) {
          await this.runProgressiveSequence(config.gameState!, config);
          return; // フレーム遅延は runProgressiveSequence → finalizeAnimationProcessing でスケジュール済み
        } else {
          // アニメーション対象なし（例: 副作用で即死し何も無い）→ 次ステップへ
          this.handleNoAnimationCase(config.gameState!, config);
          return;
        }
      }
      // produced=false の場合は通常ステップ（phase 進行や次アタッカー評価）のため従来処理へフォールバック
    }
    const previousState = config.gameState!;
    const step = this.createGameProgressStep(config.gameState!, config.onStateChange);
    let nextState: GameState;
    try {
      nextState = step.logicHandler();
    } catch (error) {
      throw error;
    }

    // 新規アクションをキューに追加
    if (nextState.actionLog.length > previousState.actionLog.length) {
      const newActions = nextState.actionLog.slice(previousState.actionLog.length);
      this.pendingActionQueue.push(...newActions);
    }

    if (this.pendingActionQueue.length === 0) {
      this.handleNoAnimationCase(nextState, config);
    } else {
      // アニメーションシーケンス開始
      await this.runProgressiveSequence(nextState, config);
    }
  }

  /**
   * BattleIterator を1アクション進め、actionLogに既に追加された最新アクションをキューへ入れる。
   * 戻り値: 進行してアクションを生成したら true / 生成できなかったら false
   */
  private executeIteratorAction(config: NonNullable<typeof this.autonomousConfig>): boolean {
    const state = config.gameState!;
    if (state.phase !== 'battle_attack') return false;

    // 既存イテレータが無ければ作成
    if (!this.activeBattleIterator) {
      this.activeBattleIterator = createBattleIterator(state);
      if (!this.activeBattleIterator) {
        // アタッカーが存在しない → 通常の processGameStep に任せる
        return false;
      }
    }

    const result = this.activeBattleIterator.next();
    if (result.done) {
      // イテレータ消費完了→通常ロジックでフェーズ遷移させるためフォールバック
      this.activeBattleIterator = null;
      return false;
    }

    // 返却されたアクションは既に actionLog に追加済みなので enqueue のみ
    this.pendingActionQueue.push(result.action);
    // UI に即座に state 変化を通知（攻撃者 hasAttacked 等）
    config.onStateChange(state);
    return true;
  }

  /**
   * アニメーションなし時の後処理
   */
  private handleNoAnimationCase(nextState: GameState, config: NonNullable<typeof this.autonomousConfig>): void {
    this.isProcessing = false;
    
    // 防御的プログラミング：nextStateの安全性確認
    if (!nextState) {
      console.warn('Invalid nextState in handleNoAnimationCase');
      return;
    }
    
    const basicDelay = Math.max(50, 250 / this.gameSpeed);
    
    if (!nextState.result) {
      this.scheduleNextProcessing(basicDelay);
    } else {
      config.onGameFinished?.();
      config.onStatsUpdate?.(nextState);
    }
  }

  /**
   * 実行エラー時のハンドリング
   */
  private handleExecutionError(error: unknown, config: NonNullable<typeof this.autonomousConfig>): void {
    console.error('Autonomous game step processing failed:', error);
    
    const errorInstance = error instanceof Error 
      ? error 
      : new Error('自律的ゲーム進行でエラーが発生しました');
    
    // テスト環境では同期的にエラーコールバックを実行
    if (process.env.NODE_ENV === 'test') {
      // アニメーション状態リセット（同期）
      config.onAnimationStateChange?.({
        isAnimating: false,
        animationType: 'none',
        sourceCardId: undefined,
        targetCardId: undefined,
      });
      
      // エラー通知（同期）
      config.onError?.(errorInstance);
    } else {
      // 本番環境では通常の非同期処理
      config.onAnimationStateChange?.({
        isAnimating: false,
        animationType: 'none',
        sourceCardId: undefined,
        targetCardId: undefined,
      });
      
      config.onError?.(errorInstance);
    }
    
    this.isProcessing = false;
  }

  /**
   * 自律的ステップ実行（Processorレベルでのゲーム進行管理）
   */
  private async executeAutonomousStep(): Promise<void> {
    if (!this.canExecuteAutonomousStep()) {
      return;
    }
    
    const config = this.autonomousConfig!;
    
    // テスト環境では従来システムと同様に即座処理（setTimeout経由を回避）
    if (process.env.NODE_ENV === 'test') {
      this.isProcessing = true;
      
      try {
        const step = this.createGameProgressStep(config.gameState!, config.onStateChange);
        const nextState = step.logicHandler(); // 直接実行（エラー時は即座例外）
        
        // 成功時の処理は簡略化
        this.isProcessing = false;
        if (nextState.result) {
          config.onGameFinished?.();
          config.onStatsUpdate?.(nextState);
        } else {
          // テスト環境では次の処理を即座スケジュール
          this.scheduleNextProcessing(0);
        }
      } catch (error) {
        const errorInstance = error instanceof Error 
          ? error 
          : new Error('自律的ゲーム進行でエラーが発生しました');
        
        // 同期的にエラー状態を設定（従来システム準拠）
        config.onError?.(errorInstance);
        this.isProcessing = false;
      }
      return;
    }
    
    // 本番環境では通常の非同期処理
    this.isProcessing = true;
    
    try {
      await this.executeGameStepWithAnimation(config);
    } catch (error) {
      this.handleExecutionError(error, config);
    }
  }

  /**
   * テスト環境でのアニメーション処理
   */
  private handleTestEnvironmentAnimation(
    nextState: GameState,
    config: NonNullable<typeof this.autonomousConfig>
  ): void {
    if (this.pendingActionQueue.length > 0) {
      const actions = [...this.pendingActionQueue];
      this.pendingActionQueue = [];
      // 簡素化: 直接変換、EventBatch中間層をスキップ
      const tasks = buildAnimationTasksFromActions(actions);
      // destroy スナップショットのみ反映（表示確認用）
      for (const t of tasks) {
        if (t.kind === 'destroy') {
          config.onAnimationStateChange?.({
            isAnimating: true,
            animationType: 'destroy',
            sourceCardId: undefined,
            targetCardId: t.targetId,
            destroySnapshot: t.snapshot,
          });
          config.onAnimationStateChange?.({
            isAnimating: false,
            animationType: 'none',
            sourceCardId: undefined,
            targetCardId: undefined,
            destroySnapshot: undefined,
          });
        }
      }
    }
    this.finalizeAnimationProcessing(nextState, config);
  }

  /**
   * 本番環境での順次アニメーション実行
   */
  private async runProgressiveSequence(
    nextState: GameState,
    config: NonNullable<typeof this.autonomousConfig>
  ): Promise<void> {
    const isTestEnvironment = process.env.NODE_ENV === 'test';
    if (isTestEnvironment) {
      this.handleTestEnvironmentAnimation(nextState, config);
      return;
    }
    if (this.pendingActionQueue.length > 0) {
      const actions = [...this.pendingActionQueue];
      this.pendingActionQueue = [];
      // 簡素化: actions -> tasks（直接変換、EventBatch中間層をスキップ）
      const tasks = buildAnimationTasksFromActions(actions);
      this.pendingTaskQueue.push(...tasks);
    }
    while (this.pendingTaskQueue.length > 0) {
      const task = this.pendingTaskQueue.shift()!;
      await this.executeAnimationTask(task, config);
    }
    this.finalizeAnimationProcessing(nextState, config);
  }

  private async executeAnimationTask(task: AnimationTask, config: NonNullable<typeof this.autonomousConfig>): Promise<void> {
    if (task.kind === 'attack') {
      await this.playSimple(task, config, 'attack');
      return;
    }
    if (task.kind === 'damage') {
      await this.playSimple(task, config, 'damage');
      return;
    }
    if (task.kind === 'destroy') {
      config.onAnimationStateChange?.({
        isAnimating: true,
        animationType: 'destroy',
        sourceCardId: undefined,
        targetCardId: task.targetId,
        destroySnapshot: task.snapshot,
      });
      await new Promise(r => setTimeout(r, task.duration / this.gameSpeed));
      config.onAnimationStateChange?.({
        isAnimating: false,
        animationType: 'none',
        sourceCardId: undefined,
        targetCardId: undefined,
        destroySnapshot: undefined,
      });
      return;
    }
    if (task.kind === 'summon') {
      await this.playSimple(task, config, 'summon');
      return;
    }
    if (task.kind === 'draw') {
      await this.playSimple(task, config, 'draw');
      return;
    }
    if (task.kind === 'spell_cast') {
      await this.playSimple(task, config, 'spell_cast');
      return;
    }
    if (task.kind === 'heal') {
      await this.playSimple(task, config, 'heal');
      return;
    }
  }

  private async playSimple(task: AnimationTask, config: NonNullable<typeof this.autonomousConfig>, animationType: AnimationState['animationType']): Promise<void> {
    config.onAnimationStateChange?.({
      isAnimating: true,
      animationType,
      sourceCardId: task.attackerId,
      targetCardId: task.targetId,
      value: task.damage, // ダメージ量・回復量を渡す
    });
    
    // CSS演出完了を確実に待機：base duration + 余裕時間
    const safeDuration = (task.duration + 50) / this.gameSpeed;
    await new Promise(r => setTimeout(r, safeDuration));
    
    config.onAnimationStateChange?.({
      isAnimating: false,
      animationType: 'none',
      sourceCardId: undefined,
      targetCardId: undefined,
    });
  }

  // 旧アニメ個別実装はタスク方式へ移行済み

  /**
   * アニメーション処理完了後の処理（簡素化版）
   */
  private finalizeAnimationProcessing(
    nextState: GameState, 
    config: NonNullable<typeof this.autonomousConfig>
  ): void {
    // アニメーション状態リセット
    config.onAnimationStateChange?.({
      isAnimating: false,
      animationType: 'none',
      sourceCardId: undefined,
      targetCardId: undefined,
    });

    if (nextState.result) {
      config.onGameFinished?.();
      config.onStatsUpdate?.(nextState);
    } else {
      // 簡素化された遅延処理
      const frameDelay = Math.max(16, 32 / this.gameSpeed);
      this.scheduleNextProcessing(frameDelay);
    }
    
    this.isProcessing = false;
  }

  /**
   * 複数アニメーション自律処理（フックから分離）
   */
  // 旧複数アニメーション処理は廃止（逐次キュー方式に置換）

  /**
   * 強制停止（エラー時の清掃用）
   */
  forceStop(): void {
    this.cancelScheduledProcessing();
    this.isProcessing = false;
    this.autonomousConfig = null;
  }
}
