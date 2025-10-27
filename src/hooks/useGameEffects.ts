/**
 * ゲーム進行エフェクト管理フック
 * 
 * 設計方針:
 * - ターン/フェーズ変更の検知
 * - ライフ/エネルギー変化の検知
 * - 視覚的フィードバックのトリガー管理
 */

import { useState, useEffect, useRef } from 'react';
import type { GameState, PlayerId, GamePhase } from '@/types/game';

export interface GameEffectState {
  // ターンバナー
  showTurnBanner: boolean;
  turnBannerTurn: number;
  turnBannerPlayer: PlayerId;
  
  // フェーズ変更
  phaseTransition: boolean;
  
  // ライフ変化
  player1LifeChange: { show: boolean; type: 'gain' | 'loss'; value: number };
  player2LifeChange: { show: boolean; type: 'gain' | 'loss'; value: number };
  
  // エネルギー変化
  player1EnergyChange: { show: boolean; value: number };
  player2EnergyChange: { show: boolean; value: number };
}

export function useGameEffects(gameState: GameState | null) {
  const [effectState, setEffectState] = useState<GameEffectState>({
    showTurnBanner: false,
    turnBannerTurn: 1,
    turnBannerPlayer: 'player1',
    phaseTransition: false,
    player1LifeChange: { show: false, type: 'loss', value: 0 },
    player2LifeChange: { show: false, type: 'loss', value: 0 },
    player1EnergyChange: { show: false, value: 0 },
    player2EnergyChange: { show: false, value: 0 },
  });

  // 前回の状態を保持
  const prevStateRef = useRef<{
    turnNumber: number;
    phase: GamePhase;
    player1Life: number;
    player2Life: number;
    player1Energy: number;
    player2Energy: number;
  } | null>(null);

  useEffect(() => {
    if (!gameState) return;

    const currentState = {
      turnNumber: gameState.turnNumber,
      phase: gameState.phase,
      player1Life: gameState.players.player1.life,
      player2Life: gameState.players.player2.life,
      player1Energy: gameState.players.player1.energy,
      player2Energy: gameState.players.player2.energy,
    };

    // 初回セットアップ
    if (!prevStateRef.current) {
      prevStateRef.current = currentState;
      return;
    }

    const prev = prevStateRef.current;

    // ターン変更検知（ドローフェーズ開始時）
    if (
      currentState.turnNumber > prev.turnNumber &&
      currentState.phase === 'draw'
    ) {
      setEffectState((state) => ({
        ...state,
        showTurnBanner: true,
        turnBannerTurn: currentState.turnNumber,
        turnBannerPlayer: gameState.currentPlayer,
      }));
    }

    // フェーズ変更検知
    if (currentState.phase !== prev.phase) {
      setEffectState((state) => ({ ...state, phaseTransition: true }));
      
      // フェーズ変更アニメーション終了後にリセット
      setTimeout(() => {
        setEffectState((state) => ({ ...state, phaseTransition: false }));
      }, 800);
    }

    // ライフ変化検知 - Player1
    if (currentState.player1Life !== prev.player1Life) {
      const diff = currentState.player1Life - prev.player1Life;
      setEffectState((state) => ({
        ...state,
        player1LifeChange: {
          show: true,
          type: diff > 0 ? 'gain' : 'loss',
          value: Math.abs(diff),
        },
      }));
    }

    // ライフ変化検知 - Player2
    if (currentState.player2Life !== prev.player2Life) {
      const diff = currentState.player2Life - prev.player2Life;
      setEffectState((state) => ({
        ...state,
        player2LifeChange: {
          show: true,
          type: diff > 0 ? 'gain' : 'loss',
          value: Math.abs(diff),
        },
      }));
    }

    // エネルギー変化検知 - Player1
    if (currentState.player1Energy > prev.player1Energy) {
      const diff = currentState.player1Energy - prev.player1Energy;
      setEffectState((state) => ({
        ...state,
        player1EnergyChange: { show: true, value: diff },
      }));
    }

    // エネルギー変化検知 - Player2
    if (currentState.player2Energy > prev.player2Energy) {
      const diff = currentState.player2Energy - prev.player2Energy;
      setEffectState((state) => ({
        ...state,
        player2EnergyChange: { show: true, value: diff },
      }));
    }

    // 状態を更新
    prevStateRef.current = currentState;
  }, [gameState]);

  // エフェクト完了時のリセット関数
  const resetTurnBanner = () => {
    setEffectState((state) => ({ ...state, showTurnBanner: false }));
  };

  const resetPlayer1LifeChange = () => {
    setEffectState((state) => ({
      ...state,
      player1LifeChange: { show: false, type: 'loss', value: 0 },
    }));
  };

  const resetPlayer2LifeChange = () => {
    setEffectState((state) => ({
      ...state,
      player2LifeChange: { show: false, type: 'loss', value: 0 },
    }));
  };

  const resetPlayer1EnergyChange = () => {
    setEffectState((state) => ({
      ...state,
      player1EnergyChange: { show: false, value: 0 },
    }));
  };

  const resetPlayer2EnergyChange = () => {
    setEffectState((state) => ({
      ...state,
      player2EnergyChange: { show: false, value: 0 },
    }));
  };

  return {
    effectState,
    resetTurnBanner,
    resetPlayer1LifeChange,
    resetPlayer2LifeChange,
    resetPlayer1EnergyChange,
    resetPlayer2EnergyChange,
  };
}
