/**
 * ゲーム進行エフェクト管理フック
 * 
 * 設計方針:
 * - ターン/フェーズ変更の検知
 * - ライフ/エネルギー変化の検知
 * - 視覚的フィードバックのトリガー管理
 */

import { useState, useEffect, useRef } from 'react';
import type { GameState, GamePhase, PlayerId, GameResult } from '@/types/game';

export interface GameEffectState {
  // フェーズ変更
  phaseTransition: boolean;
  // ライフ変動情報
  lifePulse: Array<{ playerId: PlayerId; diff: number }>;
  // エネルギー変動情報
  energyPulse: Array<{ playerId: PlayerId; diff: number }>;
  // 勝敗決着の瞬間
  resultChange: boolean;
}

export function useGameEffects(gameState: GameState | null) {
  const [effectState, setEffectState] = useState<GameEffectState>({
    phaseTransition: false,
    lifePulse: [],
    energyPulse: [],
    resultChange: false,
  });

  // 前回の状態を保持
  const prevStateRef = useRef<{
    phase: GamePhase;
    playerLife: Record<PlayerId, number>;
    playerEnergy: Record<PlayerId, number>;
    result?: GameResult;
  } | null>(null);

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearScheduledResets = () => {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
  };

  const scheduleReset = (updater: (state: GameEffectState) => GameEffectState, delay: number) => {
    const timeoutId = setTimeout(() => {
      setEffectState((state) => updater(state));
      timeoutsRef.current = timeoutsRef.current.filter((id) => id !== timeoutId);
    }, delay);
    timeoutsRef.current.push(timeoutId);
  };

  useEffect(() => {
    if (!gameState) return;

    const currentState = {
      phase: gameState.phase,
      playerLife: {
        player1: gameState.players.player1.life,
        player2: gameState.players.player2.life,
      },
      playerEnergy: {
        player1: gameState.players.player1.energy,
        player2: gameState.players.player2.energy,
      },
      result: gameState.result,
    };

    // 初回セットアップ
    if (!prevStateRef.current) {
      prevStateRef.current = currentState;
      return;
    }

    const prev = prevStateRef.current;
    clearScheduledResets();
    let phaseTransition = false;
    const lifePulse: Array<{ playerId: PlayerId; diff: number }> = [];
    const energyPulse: Array<{ playerId: PlayerId; diff: number }> = [];
    let resultChange = false;

    // フェーズ変更検知
    if (currentState.phase !== prev.phase) {
      phaseTransition = true;
      scheduleReset((state) => ({ ...state, phaseTransition: false }), 800);
    }

    // ライフ変動検知
    (['player1', 'player2'] as PlayerId[]).forEach((pid) => {
      const diff = currentState.playerLife[pid] - prev.playerLife[pid];
      if (diff !== 0) {
        lifePulse.push({ playerId: pid, diff });
      }
    });
    if (lifePulse.length > 0) {
      scheduleReset((state) => ({ ...state, lifePulse: [] }), 700);
    }

    // エネルギー変動検知
    (['player1', 'player2'] as PlayerId[]).forEach((pid) => {
      const diff = currentState.playerEnergy[pid] - prev.playerEnergy[pid];
      if (diff !== 0) {
        energyPulse.push({ playerId: pid, diff });
      }
    });
    if (energyPulse.length > 0) {
      scheduleReset((state) => ({ ...state, energyPulse: [] }), 700);
    }

    // 勝敗確定検知
    if (!prev.result && currentState.result) {
      resultChange = true;
      scheduleReset((state) => ({ ...state, resultChange: false }), 1200);
    }

    setEffectState({
      phaseTransition,
      lifePulse,
      energyPulse,
      resultChange,
    });

    prevStateRef.current = currentState;
  }, [gameState]);

  useEffect(() => () => clearScheduledResets(), []);

  return {
    effectState,
  };
}
