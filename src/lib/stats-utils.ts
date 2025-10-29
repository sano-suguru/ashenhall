import type { GameState, GameAction, LocalStats } from '@/types/game';
import { GAME_CONSTANTS } from '@/types/game';
import { getTurnNumberForAction } from './game-state-utils';
// battle-analysis統合版（簡易実装）
interface TurnContext {
  turnNumber: number;
  player1Damage: number;
  player2Damage: number;
  player1LifeAfter: number;
  player2LifeAfter: number;
  actions: GameAction[];
}

function determineTurnSignificance(context: TurnContext): string | null {
  const totalDamage = context.player1Damage + context.player2Damage;

  if (totalDamage >= 8) return '大ダメージターン';
  if (totalDamage >= 4) return '中ダメージターン';
  if (context.player1LifeAfter <= 5 || context.player2LifeAfter <= 5) return '危険ライフ';
  if (context.turnNumber <= 3 && totalDamage > 0) return '初回攻撃';

  return null;
}

const STATS_STORAGE_KEY = 'ashenhall_local_stats';

// --- Local Stats Management ---

const initialStats: LocalStats = {
  totalGames: 0,
  totalWins: 0,
  factionStats: {
    necromancer: { games: 0, wins: 0 },
    berserker: { games: 0, wins: 0 },
    mage: { games: 0, wins: 0 },
    knight: { games: 0, wins: 0 },
    inquisitor: { games: 0, wins: 0 },
  },
  lastPlayed: new Date().toISOString(),
};

export function loadStats(): LocalStats {
  try {
    const statsJson = localStorage.getItem(STATS_STORAGE_KEY);
    return statsJson ? JSON.parse(statsJson) : initialStats;
  } catch (error) {
    console.error('Failed to load stats:', error);
    return initialStats;
  }
}

export function saveStats(stats: LocalStats) {
  try {
    const statsJson = JSON.stringify(stats);
    localStorage.setItem(STATS_STORAGE_KEY, statsJson);
  } catch (error) {
    console.error('Failed to save stats:', error);
  }
}

export function updateStatsWithGameResult(stats: LocalStats, gameState: GameState): LocalStats {
  if (!gameState.result) return stats;

  const newStats = JSON.parse(JSON.stringify(stats)) as LocalStats;
  const playerFaction = gameState.players.player1.faction;

  newStats.totalGames += 1;
  newStats.factionStats[playerFaction].games += 1;

  if (gameState.result.winner === 'player1') {
    newStats.totalWins += 1;
    newStats.factionStats[playerFaction].wins += 1;
  }

  newStats.lastPlayed = new Date().toISOString();

  return newStats;
}

// --- Battle Log Analysis ---

// HP変化追跡機能
export interface TurnSummary {
  turnNumber: number;
  player1Damage: number;
  player2Damage: number;
  significance: string | null;
  player1LifeBefore: number;
  player1LifeAfter: number;
  player2LifeBefore: number;
  player2LifeAfter: number;
}

// ターンごとのHP変化を計算
export function calculateTurnSummaries(gameState: GameState): TurnSummary[] {
  const summaries: TurnSummary[] = [];
  let currentPlayer1Life = GAME_CONSTANTS.INITIAL_LIFE;
  let currentPlayer2Life = GAME_CONSTANTS.INITIAL_LIFE;

  const turnGroups: Record<number, GameAction[]> = {};
  gameState.actionLog.forEach((action) => {
    const turnNumber = getTurnNumberForAction(action, gameState);
    if (!turnGroups[turnNumber]) turnGroups[turnNumber] = [];
    turnGroups[turnNumber].push(action);
  });

  Object.entries(turnGroups)
    .sort(([a], [b]) => Number(a) - Number(b))
    .forEach(([turnNum, actions]) => {
      const turnNumber = Number(turnNum);
      const player1LifeBefore = currentPlayer1Life;
      const player2LifeBefore = currentPlayer2Life;
      let player1Damage = 0;
      let player2Damage = 0;

      actions.forEach((action) => {
        if (
          action.type === 'card_attack' &&
          (action.data.targetId === 'player1' || action.data.targetId === 'player2')
        ) {
          if (action.playerId === 'player1') {
            player2Damage += action.data.damage;
          } else {
            player1Damage += action.data.damage;
          }
        } else if (action.type === 'effect_trigger' && action.data.effectType === 'damage') {
          Object.entries(action.data.targets).forEach(([targetId, valueChange]) => {
            if (valueChange.life) {
              const damage = Math.max(0, valueChange.life.before - valueChange.life.after);
              if (targetId === 'player1') {
                player1Damage += damage;
              } else if (targetId === 'player2') {
                player2Damage += damage;
              }
            }
          });
        }
      });

      currentPlayer1Life -= player1Damage;
      currentPlayer2Life -= player2Damage;

      const turnContext: TurnContext = {
        turnNumber,
        player1Damage,
        player2Damage,
        player1LifeAfter: currentPlayer1Life,
        player2LifeAfter: currentPlayer2Life,
        actions,
      };

      const significance = determineTurnSignificance(turnContext);

      if (player1Damage > 0 || player2Damage > 0 || significance) {
        summaries.push({
          turnNumber,
          player1Damage,
          player2Damage,
          significance,
          player1LifeBefore,
          player1LifeAfter: currentPlayer1Life,
          player2LifeBefore,
          player2LifeAfter: currentPlayer2Life,
        });
      }
    });

  return summaries;
}
