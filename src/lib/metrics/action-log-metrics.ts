import type { GameState, GameAction } from '@/types/game';

interface ActionTypeCounts {
  total: number;
  byType: Record<string, number>;
}

interface TurnActionMetrics extends ActionTypeCounts {
  turnNumber: number;
  currentPlayer: string;
}

interface GameActionMetricsSummary {
  gameId: string;
  totalTurns: number;
  aggregate: ActionTypeCounts;
  perTurn: TurnActionMetrics[];
  aggregatePhases?: {
    totalByPhase: Record<string, number>;
    ratioByPhase: Record<string, number>;
  };
}

function emptyCounts(): ActionTypeCounts {
  return { total: 0, byType: {} };
}

function addAction(counts: ActionTypeCounts, action: GameAction): void {
  counts.total += 1;
  counts.byType[action.type] = (counts.byType[action.type] || 0) + 1;
}

function computePerTurnMetrics(state: GameState): TurnActionMetrics[] {
  const result: TurnActionMetrics[] = [];
  // フェーズやターン推移で action.sequence を元に各ターンのスライスを抽出
  // GameState 自体はターン境界を明示しないため、簡易に phase_change の toPhase === 'draw' を新ターン開始とみなす
  let currentTurn = 1;
  let currentPlayer: string = state.players.player1.id === 'player1' ? 'player1' : 'player2';
  let bucket: ActionTypeCounts = emptyCounts();

  for (const action of state.actionLog) {
    if (action.type === 'phase_change') {
      const toPhase = action.data.toPhase;
      if (toPhase === 'draw') {
        // 新ターン開始: 既存バケット flush
        if (bucket.total > 0) {
          result.push({ turnNumber: currentTurn, currentPlayer, ...bucket });
        }
        currentTurn += 1;
        bucket = emptyCounts();
        currentPlayer = action.playerId;
      }
    }
    addAction(bucket, action);
  }
  if (bucket.total > 0) {
    result.push({ turnNumber: currentTurn, currentPlayer, ...bucket });
  }
  return result;
}

export function computeGameMetrics(state: GameState): GameActionMetricsSummary {
  const perTurn = computePerTurnMetrics(state);
  const aggregate: ActionTypeCounts = emptyCounts();
  const phaseTotals: Record<string, number> = {};
  let currentPhase = 'draw';
  for (const t of perTurn) {
    aggregate.total += t.total;
    for (const [k, v] of Object.entries(t.byType)) {
      aggregate.byType[k] = (aggregate.byType[k] || 0) + v;
    }
  }

  // フェーズ集計: actionLog を直接走査
  for (const action of state.actionLog) {
    if (action.type === 'phase_change') {
      currentPhase = action.data.toPhase;
    }
    phaseTotals[currentPhase] = (phaseTotals[currentPhase] || 0) + 1;
  }
  const phaseRatios: Record<string, number> = {};
  const totalActions = aggregate.total || 1;
  for (const [phase, count] of Object.entries(phaseTotals)) {
    phaseRatios[phase] = count / totalActions;
  }
  return {
    gameId: state.gameId,
    totalTurns: state.turnNumber,
    aggregate,
    perTurn,
    aggregatePhases: { totalByPhase: phaseTotals, ratioByPhase: phaseRatios }
  };
}

export function formatMetrics(summary: GameActionMetricsSummary): string {
  const header = `Game ${summary.gameId} - turns=${summary.totalTurns} totalActions=${summary.aggregate.total}`;
  const byType = Object.entries(summary.aggregate.byType)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}:${v}`)
    .join(', ');
  let phasesLine = '';
  if (summary.aggregatePhases) {
    const phaseEntries = Object.entries(summary.aggregatePhases.totalByPhase)
      .sort((a,b) => b[1]-a[1])
      .map(([p,c]) => `${p}:${c}`)
      .join(', ');
    phasesLine = `Phases ${phaseEntries}`;
  }
  const perTurnLines = summary.perTurn.map(t => {
    const detail = Object.entries(t.byType)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}:${v}`)
      .join(' ');
    return `Turn ${t.turnNumber} (${t.currentPlayer}) total=${t.total} ${detail}`;
  });
  return [header, `ByType ${byType}`, phasesLine, ...perTurnLines].filter(Boolean).join('\n');
}
