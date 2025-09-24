import type { GameAction } from '@/types/game';
import type { GameState } from '@/types/game-state';
import { buildEventBatches } from '@/lib/animation/event-batch-builder';
import { buildAnimationTasksFromBatches, type AnimationTask } from '@/lib/animation/animation-tasks';
import { stepGame } from './step-game';

/**
 * OrchestratorV2
 *  - 目的: action -> batch -> animationTask パイプラインを確立し、旧 Processor から移行する足場。
 *  - 現状: GameState 推進ロジック自体は旧システム (processGameStep 等) に依存したまま。
 *  - 今後: stepGame(state) の純関数化後、内部でその関数を利用し差分 actions を収集する形へ移行予定。
 *
 * TODO(v2-phase1): GameState 推進 (stepGame 抽出) を統合
 * TODO(v2-phase2): Feature Flag で UI 利用箇所を V1 -> V2 へ切替
 * TODO(v2-phase3): Invariant: damage action 全てが impact タスクへ 1+:1 対応
 * TODO(v2-phase4): 旧 completion-aware-processor のアニメーション生成部削除
 * TODO(v2-phase5): 並列再生 (blocking=false) 最適化
 */
export class OrchestratorV2 {
  private state: GameState;
  private collectedActions: GameAction[] = [];

  constructor(initialState: GameState) {
    this.state = initialState;
  }

  /** 1ステップ進めて新規アクションを収集 */
  stepAndCollectActions(): GameAction[] {
    const { newState, newActions } = stepGame(this.state);
    this.state = newState;
    if (newActions.length > 0) {
      this.collectedActions.push(...newActions);
    }
    return newActions;
  }

  /** テスト用: 任意アクションを直接投入 (state.actionLog を介さず) */
  ingestActionsForTest(actions: GameAction[]) {
    this.collectedActions.push(...actions);
  }

  /** 現在までに取り込んだアクションからバッチ/タスクを再構築 */
  buildAnimationTasks(): AnimationTask[] {
    const batches = buildEventBatches(this.collectedActions);
    const tasks = buildAnimationTasksFromBatches(batches);
    this.assertDamageMappingInvariant(this.collectedActions, tasks);
    return tasks;
  }

  /** ダメージ系アクションが最低1つの impact を持つことを保証 */
  private assertDamageMappingInvariant(actions: GameAction[], tasks: AnimationTask[]) {
    const impactBySeq = this.indexImpactTasks(tasks);
    const violations = this.collectDamageTaskViolations(actions, impactBySeq);
    if (violations.length) {
      const detail = violations.map(v => `${v.sequence}:${v.type}`).join(', ');
      throw new Error(`Damage mapping invariant violated (missing impact tasks): ${detail}`);
    }
  }

  private indexImpactTasks(tasks: AnimationTask[]): Map<number, number> {
    const map = new Map<number, number>();
    for (const t of tasks) if (t.kind === 'impact') map.set(t.sequence, (map.get(t.sequence) || 0) + 1);
    return map;
  }

  private collectDamageTaskViolations(actions: GameAction[], impactBySeq: Map<number, number>) {
    const out: { sequence: number; type: string }[] = [];
    for (const a of actions) {
      if (a.type === 'card_attack') {
        if (!impactBySeq.get(a.sequence)) out.push({ sequence: a.sequence, type: a.type });
      } else if (a.type === 'effect_trigger' && a.data.effectType === 'damage') {
        if (!impactBySeq.get(a.sequence)) out.push({ sequence: a.sequence, type: `${a.type}:damage` });
      }
    }
    return out;
  }
}
