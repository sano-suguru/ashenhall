#!/usr/bin/env ts-node
/*
  基準メトリクス収集スクリプト
  - 目的: 後続フェーズ iterator 導入前の actionLog 指標ベースライン確立
  - 出力: simulation_reports/metrics-baseline-<ISO>.json
  - 指標: ゲーム単位 metrics + 集計(平均/中央値/最大)、アクション種別頻度、combat_stage 比率
*/
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// ゲーム初期化/進行用の既存ユーティリティを仮インポート (実在しない場合は後で調整)
// プロジェクトに headless シミュレーション関数がある前提; なければ最小 headless ループを追記予定
import { createInitialGameState, processGameStep } from '../src/lib/game-engine/core.ts';
import { computeGameMetrics } from '../src/lib/metrics/action-log-metrics.ts';

interface BaselineConfig {
  games: number;
  maxStepsPerGame: number;
  seedBase: number;
}

interface GameBaselineResult { gameIndex: number; seed: number; metrics: ReturnType<typeof computeGameMetrics>; }

function median(nums: number[]): number { if (!nums.length) return 0; const sorted = [...nums].sort((a,b)=>a-b); const mid = Math.floor(sorted.length/2); return sorted.length % 2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2; }

async function simulateOneGame(seed: number, maxSteps: number): Promise<GameBaselineResult> {
  const gid = `baseline-${seed}`;
  let state = createInitialGameState(
    gid,
    [],
    [],
    'mage',
    'mage',
    String(seed)
  );
  let steps = 0;
  while (!state.result && steps < maxSteps) {
    state = processGameStep(state);
    steps++;
  }
  return { gameIndex: seed, seed, metrics: computeGameMetrics(state) };
}

async function main() {
  const cfg: BaselineConfig = {
    games: parseInt(process.env.BASELINE_GAMES || '12', 10),
    maxStepsPerGame: parseInt(process.env.BASELINE_MAX_STEPS || '2000', 10),
    seedBase: parseInt(process.env.BASELINE_SEED_BASE || '1000', 10),
  };

  const results: GameBaselineResult[] = [];
  for (let i = 0; i < cfg.games; i++) {
    const seed = cfg.seedBase + i;
  const r = await simulateOneGame(seed, cfg.maxStepsPerGame);
  results.push(r);
  console.log(`[baseline] game ${i+1}/${cfg.games} seed=${seed} totalActions=${r.metrics.aggregate.total}`);
  }

  // 集計
  const totalActionsList = results.map(r => r.metrics.aggregate.total);
  const combatStageRatios = results.map(r => {
    const combatStageActions = r.metrics.aggregate.byType['combat_stage'] || 0;
    return combatStageActions / Math.max(1, r.metrics.aggregate.total);
  });

  const aggregate = {
    games: cfg.games,
    totalActions: {
      avg: totalActionsList.reduce((a,b)=>a+b,0) / cfg.games,
      median: median(totalActionsList),
      max: Math.max(...totalActionsList),
      min: Math.min(...totalActionsList),
    },
    combatStageRatio: {
      avg: combatStageRatios.reduce((a,b)=>a+b,0) / cfg.games,
      median: median(combatStageRatios),
      max: Math.max(...combatStageRatios),
      min: Math.min(...combatStageRatios),
    },
  };

  const out = { timestamp: new Date().toISOString(), config: cfg, aggregate, games: results };
  const dir = join(process.cwd(), 'simulation_reports');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `metrics-baseline-${out.timestamp.replace(/[:]/g,'-')}.json`);
  writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`Baseline metrics written: ${file}`);
}

main().catch(e => { console.error(e); process.exit(1); });
