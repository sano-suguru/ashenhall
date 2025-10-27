/**
 * ゲーム進行エフェクト管理フック
 * 
 * 設計方針:
 * - ターン/フェーズ変更の検知
 * - ライフ/エネルギー変化の検知
 * - 視覚的フィードバックのトリガー管理
 */

import { useState, useEffect, useRef } from 'react';
import type { GameState, GamePhase } from '@/types/game';

export interface GameEffectState {
  // フェーズ変更
  phaseTransition: boolean;
}

export function useGameEffects(gameState: GameState | null) {
  const [effectState, setEffectState] = useState<GameEffectState>({
    phaseTransition: false,
  });

  // 前回の状態を保持
  const prevStateRef = useRef<{
    phase: GamePhase;
  } | null>(null);

  useEffect(() => {
    if (!gameState) return;

    const currentState = {
      phase: gameState.phase,
    };

    // 初回セットアップ
    if (!prevStateRef.current) {
      prevStateRef.current = currentState;
      return;
    }

    const prev = prevStateRef.current;

    // フェーズ変更検知
    if (currentState.phase !== prev.phase) {
      setEffectState((state) => ({ ...state, phaseTransition: true }));
      
      // フェーズ変更アニメーション終了後にリセット
      setTimeout(() => {
        setEffectState((state) => ({ ...state, phaseTransition: false }));
      }, 800);
    }

    // 状態を更新
    prevStateRef.current = currentState;
  }, [gameState]);

  return {
    effectState,
  };
}
