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
import { buildAnimationTasksFromBatches, type AnimationTask } from '@/lib/animation/animation-tasks';
import { buildEventBatches } from '@/lib/animation/event-batch-builder';


/**
 * アニメーション設定
 */
export interface AnimationState {
  isAnimating: boolean;
  animationType: 'attack' | 'damage' | 'destroy' | 'none';
  sourceCardId: string | undefined;
  targetCardId: string | undefined;
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
  private currentAction: GameAction | null = null;
  private currentDamageValue: number | null = null;
  private aoeTargetQueue: string[] = [];
  private aoeCurrentTarget: string | null = null;
  private destroyTargetId: string | null = null;
  private attackCooldownMs = 80; // ユーザー指定
  private activeBattleIterator: BattleIterator | null = null;
  // 直近に再生したアニメーションタスクの種類（クールダウン計算用）
  private lastAnimationKind: import('@/lib/animation/animation-tasks').AnimationTaskKind | null = null;
  // 攻撃内部のサブステージ( windup→strike→impact など )を視覚的に区切る短いギャップ(ms)
  private intraAttackGapMs = 36;
  
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
   * 現在のターゲットに対するダメージ値取得（フックから利用）
   */
  getCurrentDamageAmount(cardId: string): number {
    if (this.currentAction?.type === 'effect_trigger' && this.currentAction.data.effectType === 'damage') {
      if (this.aoeCurrentTarget === cardId) {
        return this.currentAction.data.effectValue ?? this.currentDamageValue ?? 0;
      }
    }
    return 0;
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
      const batches = buildEventBatches(actions);
      const tasks = buildAnimationTasksFromBatches(batches);
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
      // V2: actions -> batches -> tasks（常時利用）
      const batches = buildEventBatches(actions);
      const tasks = buildAnimationTasksFromBatches(batches);
      this.pendingTaskQueue.push(...tasks);
    }
    while (this.pendingTaskQueue.length > 0) {
      const task = this.pendingTaskQueue.shift()!;
      await this.executeAnimationTask(task, config);
    }
    this.finalizeAnimationProcessing(nextState, config);
  }

  private processSingleActionInstant(config: NonNullable<typeof this.autonomousConfig>): void {
    const action = this.pendingActionQueue.shift();
    if (!action) return;
    this.currentAction = action;
    // テスト環境では onAnimationStateChange を action 種類に応じ一度だけ発火し即リセット
    const { type } = action;
    let animationType: AnimationState['animationType'] = 'none';
    let source: string | undefined;
    let target: string | undefined;
    if (type === 'card_attack') {
      animationType = 'attack';
      source = action.data.attackerCardId;
      // target は card_attack の targetId (プレイヤーID の可能性あり)
      target = action.data.targetId.startsWith('player') ? undefined : action.data.targetId;
    } else if (type === 'effect_trigger' && action.data.effectType === 'damage') {
      animationType = 'damage';
      const first = Object.keys(action.data.targets)[0];
      target = first;
      source = action.data.sourceCardId;
    } else if (type === 'creature_destroyed') {
      animationType = 'destroy';
      target = action.data.destroyedCardId;
    }
    if (animationType !== 'none') {
      config.onAnimationStateChange?.({
        isAnimating: true,
        animationType,
        sourceCardId: source,
        targetCardId: target,
      });
      // 即リセット
      config.onAnimationStateChange?.({
        isAnimating: false,
        animationType: 'none',
        sourceCardId: undefined,
        targetCardId: undefined,
      });
    }
  }

  // 旧API互換のダミー (段階的移行用)
  private async processSingleActionWithAnimation(): Promise<void> { /* deprecated */ }
  private async runAttackAnimation(): Promise<void> { /* deprecated */ }
  private async runDamageAnimation(): Promise<void> { /* deprecated */ }
  private async runDestroyAnimation(): Promise<void> { /* deprecated */ }

  private async executeAnimationTask(task: AnimationTask, config: NonNullable<typeof this.autonomousConfig>): Promise<void> {
    if (task.kind === 'attack_windup' || task.kind === 'attack_strike' || task.kind === 'attack_retaliate') {
      await this.playSimple(task, config, 'attack');
      this.lastAnimationKind = task.kind;
      await this.maybeIntraAttackGap();
      return;
    }
    if (task.kind === 'impact') {
      await this.playSimple(task, config, 'damage');
      this.lastAnimationKind = task.kind;
      await this.maybeIntraAttackGap();
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
      this.lastAnimationKind = task.kind;
      await this.maybeIntraAttackGap();
      return;
    }
  }

  private async playSimple(task: AnimationTask, config: NonNullable<typeof this.autonomousConfig>, animationType: AnimationState['animationType']): Promise<void> {
    config.onAnimationStateChange?.({
      isAnimating: true,
      animationType,
      sourceCardId: task.attackerId,
      targetCardId: task.targetId,
    });
    await new Promise(r => setTimeout(r, task.duration / this.gameSpeed));
    config.onAnimationStateChange?.({
      isAnimating: false,
      animationType: 'none',
      sourceCardId: undefined,
      targetCardId: undefined,
    });
  }

  // 旧アニメ個別実装はタスク方式へ移行済み

  /**
   * アニメーション処理完了後の処理
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
      // ベースの最小遅延
      let frameDelay = Math.max(16, 32 / this.gameSpeed);
      // 直近が攻撃関連/impact/destroy の場合は攻撃クールダウンを適用して視覚的な重なりを抑止
      if (this.lastAnimationKind && (
        this.lastAnimationKind.startsWith('attack_') ||
        this.lastAnimationKind === 'impact' ||
        this.lastAnimationKind === 'destroy'
      )) {
        frameDelay = Math.max(frameDelay, this.attackCooldownMs / this.gameSpeed);
      }
      this.scheduleNextProcessing(frameDelay);
    }
    
    this.isProcessing = false;
    this.lastAnimationKind = null; // リセット
  }

  // 攻撃内部サブステージ間に短いギャップを挿入（テスト環境はスキップして速度維持）
  private async maybeIntraAttackGap(): Promise<void> {
    if (process.env.NODE_ENV === 'test') return; // テスト速度重視
    if (!this.lastAnimationKind) return;
    const attackRelated = this.lastAnimationKind.startsWith('attack_') || this.lastAnimationKind === 'impact' || this.lastAnimationKind === 'destroy';
    if (!attackRelated) return;
    const gap = this.intraAttackGapMs / this.gameSpeed;
    if (gap <= 0) return;
    await new Promise(r => setTimeout(r, gap));
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
