import type { GameAction } from '@/types/game';

export interface DamageAnalysis {
  player1Damage: number;
  player2Damage: number;
  damageCategory: 'none' | 'light' | 'medium' | 'heavy';
}

export interface ConditionAnalysis {
  hasPlayerAttack: boolean;
  isEarlyGame: boolean;
  hasCriticalLife: boolean;
  isEndgamePhase: boolean;
}

export interface TurnContext {
  turnNumber: number;
  player1Damage: number;
  player2Damage: number;
  player1LifeAfter: number;
  player2LifeAfter: number;
  actions: GameAction[];
}

export interface SignificanceRules {
  damageThresholds: {
    medium: number;    // 3
    heavy: number;     // 5
  };
  lifeThresholds: {
    critical: number;  // 5
  };
  turnThresholds: {
    earlyGame: number; // 5
    endGame: number;   // 8
  };
}
