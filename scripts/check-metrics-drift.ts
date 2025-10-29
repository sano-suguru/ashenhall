#!/usr/bin/env ts-node
/*
  メトリクスドリフト検知スクリプト
  - 最新 baseline (metrics-baseline-*.json) を読み込み
  - 現行コードで複数ゲームシミュレーションし同指標再計測
  - 乖離が閾値を超えた場合 exit 1

  閾値 (ENV で上書き可):
    DRIFT_MAX_ACTION_INCREASE_PCT (default 0.20)
    DRIFT_MAX_ACTION_ABS_INCREASE (default 50)
    DRIFT_MAX_COMBAT_RATIO_INCREASE (default 0.10)

  シミュレーション制御:
    DRIFT_GAMES (default 6)
    DRIFT_MAX_STEPS (default 2000)
    DRIFT_SEED_BASE (default 9000)

  追加予定候補 (必要になれば): フェーズ別比率 / アクションタイプ個別監視
*/
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createInitialGameState, processGameStep } from '../src/lib/game-engine/core.ts';
import { computeGameMetrics } from '../src/lib/metrics/action-log-metrics.ts';

interface BaselineAggregate {
  totalActions: { avg: number };
  combatStageRatio: { avg: number };
  // その他フィールドは利用しないため省略
}

interface BaselineFile {
  timestamp: string;
  aggregate: BaselineAggregate;
  config?: Record<string, unknown> | undefined;
}

interface DriftConfig {
  games: number;
  maxStepsPerGame: number;
  seedBase: number;
  maxActionIncreasePct: number; // 相対
  maxActionAbsIncrease: number; // 絶対
  maxCombatRatioIncrease: number; // 絶対差 (0-1)
}

interface CurrentAggregate {
  totalActionsAvg: number;
  combatStageRatioAvg: number;
}

function loadLatestBaseline(dir: string): BaselineFile | null {
  let latest: { file: string; ts: string } | null = null;
  const files = readdirSync(dir, { withFileTypes: true })
    .filter((f) => f.isFile() && f.name.startsWith('metrics-baseline-') && f.name.endsWith('.json'))
    .map((f) => f.name);
  for (const f of files) {
    const m = f.match(/metrics-baseline-(.*)\.json/);
    if (!m) continue;
    const ts = m[1];
    if (!latest || ts > latest.ts) {
      latest = { file: f, ts };
    }
  }
  if (!latest) return null;
  const raw = readFileSync(join(dir, latest.file), 'utf-8');
  return JSON.parse(raw) as BaselineFile;
}

async function simulateOne(seed: number, maxSteps: number) {
  let state = createInitialGameState(`drift-${seed}`, [], [], 'mage', 'mage', String(seed));
  let steps = 0;
  while (!state.result && steps < maxSteps) {
    state = processGameStep(state);
    steps++;
  }
  const metrics = computeGameMetrics(state);
  const combatStage = metrics.aggregate.byType['combat_stage'] || 0;
  const ratio = combatStage / Math.max(1, metrics.aggregate.total);
  return { total: metrics.aggregate.total, combatStageRatio: ratio };
}

async function runCurrentAggregate(
  cfg: DriftConfig
): Promise<CurrentAggregate & { raw: { total: number; combatStageRatio: number }[] }> {
  const rows: { total: number; combatStageRatio: number }[] = [];
  for (let i = 0; i < cfg.games; i++) {
    const seed = cfg.seedBase + i;
    const r = await simulateOne(seed, cfg.maxStepsPerGame);
    rows.push(r);
    console.log(
      `[drift] game ${i + 1}/${cfg.games} seed=${seed} total=${r.total} combatStageRatio=${r.combatStageRatio.toFixed(4)}`
    );
  }
  const totalAvg = rows.reduce((a, b) => a + b.total, 0) / rows.length;
  const combatAvg = rows.reduce((a, b) => a + b.combatStageRatio, 0) / rows.length;
  return { totalActionsAvg: totalAvg, combatStageRatioAvg: combatAvg, raw: rows };
}

function formatDelta(baseline: BaselineFile, current: CurrentAggregate) {
  const bTotal = baseline.aggregate.totalActions.avg;
  const bCombat = baseline.aggregate.combatStageRatio.avg;
  const dTotalAbs = current.totalActionsAvg - bTotal;
  const dTotalPct = bTotal === 0 ? 0 : dTotalAbs / bTotal;
  const dCombat = current.combatStageRatioAvg - bCombat;
  return { bTotal, bCombat, dTotalAbs, dTotalPct, dCombat };
}

function evaluate(delta: ReturnType<typeof formatDelta>, cfg: DriftConfig) {
  const reasons: string[] = [];
  if (delta.dTotalPct > cfg.maxActionIncreasePct && delta.dTotalAbs > cfg.maxActionAbsIncrease) {
    reasons.push(
      `totalActions avg drift: +${(delta.dTotalPct * 100).toFixed(1)}% (+${delta.dTotalAbs.toFixed(1)}) > pct>${(cfg.maxActionIncreasePct * 100).toFixed(1)}% & abs>${cfg.maxActionAbsIncrease}`
    );
  }
  if (delta.dCombat > cfg.maxCombatRatioIncrease) {
    reasons.push(
      `combatStageRatio avg drift: +${(delta.dCombat * 100).toFixed(2)}pp > ${(cfg.maxCombatRatioIncrease * 100).toFixed(2)}pp`
    );
  }
  return reasons;
}

function logConfigSummary(baseline: BaselineFile, cfg: DriftConfig) {
  console.log(
    `[drift] baseline timestamp=${baseline.timestamp} totalActions.avg=${baseline.aggregate.totalActions.avg.toFixed(2)} combatStageRatio.avg=${baseline.aggregate.combatStageRatio.avg.toFixed(4)}`
  );
  console.log(`[drift] config games=${cfg.games} maxSteps=${cfg.maxStepsPerGame}`);
}

function buildConfig(): DriftConfig {
  return {
    games: parseInt(process.env.DRIFT_GAMES || '6', 10),
    maxStepsPerGame: parseInt(process.env.DRIFT_MAX_STEPS || '2000', 10),
    seedBase: parseInt(process.env.DRIFT_SEED_BASE || '9000', 10),
    maxActionIncreasePct: parseFloat(process.env.DRIFT_MAX_ACTION_INCREASE_PCT || '0.20'),
    maxActionAbsIncrease: parseInt(process.env.DRIFT_MAX_ACTION_ABS_INCREASE || '50', 10),
    maxCombatRatioIncrease: parseFloat(process.env.DRIFT_MAX_COMBAT_RATIO_INCREASE || '0.10'),
  };
}

function writeSummary(reportsDir: string, summary: unknown): string {
  mkdirSync(reportsDir, { recursive: true });
  const outFile = join(
    reportsDir,
    `metrics-drift-check-${new Date().toISOString().replace(/[:]/g, '-')}.json`
  );
  writeFileSync(outFile, JSON.stringify(summary, null, 2));
  return outFile;
}

async function main() {
  const reportsDir = join(process.cwd(), 'simulation_reports');
  const baseline = loadLatestBaseline(reportsDir);
  if (!baseline) {
    console.error('No baseline file found (metrics-baseline-*.json). Generate one first.');
    process.exit(2);
  }
  const cfg = buildConfig();
  logConfigSummary(baseline, cfg);
  const current = await runCurrentAggregate(cfg);
  const delta = formatDelta(baseline, current);
  const reasons = evaluate(delta, cfg);
  const summary = {
    baseline: { totalActionsAvg: delta.bTotal, combatStageRatioAvg: delta.bCombat },
    current: {
      totalActionsAvg: current.totalActionsAvg,
      combatStageRatioAvg: current.combatStageRatioAvg,
    },
    delta: {
      totalActions: { abs: delta.dTotalAbs, pct: delta.dTotalPct },
      combatStageRatio: { abs: delta.dCombat },
    },
    threshold: cfg,
    status: reasons.length ? 'DRIFT' : 'OK',
  };
  const outFile = writeSummary(reportsDir, summary);
  console.log(`[drift] summary written: ${outFile}`);
  console.log(
    `[drift] totalActions: baseline=${delta.bTotal.toFixed(2)} current=${current.totalActionsAvg.toFixed(2)} diffAbs=${delta.dTotalAbs.toFixed(2)} diffPct=${(delta.dTotalPct * 100).toFixed(2)}%`
  );
  console.log(
    `[drift] combatStageRatio: baseline=${delta.bCombat.toFixed(4)} current=${current.combatStageRatioAvg.toFixed(4)} diff=${delta.dCombat.toFixed(4)}`
  );
  if (reasons.length) {
    console.error('[drift] FAIL reasons:');
    for (const r of reasons) console.error(' - ' + r);
    process.exit(1);
  } else {
    console.log('[drift] OK (no threshold exceeded)');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
