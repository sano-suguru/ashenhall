/**
 * ゲーム制御フック - 再生・一時停止・ターン操作・速度制御
 * 
 * 設計方針:
 * - BattlePlaybackControlsとの完全インターフェース対応
 * - 自動一時停止ロジックの実装
 * - Phase 1拡張への準備（基本制御の抽象化）
 */

import { useState, useCallback } from 'react';

export interface GameControlsReturn {
  // 基本状態
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTurn: number;
  setCurrentTurn: (turn: number) => void;
  gameSpeed: number;
  setGameSpeed: (speed: number) => void;
  
  // BattlePlaybackControls対応コールバック
  onPlayPause: () => void;
  onTurnChange: (turn: number) => void;
  onSpeedChange: (speed: number) => void;
  onJumpToStart: () => void;
  onJumpToEnd: () => void;
}

export interface GameControlsConfig {
  initialIsPlaying?: boolean;
  initialCurrentTurn?: number;
  initialGameSpeed?: number;
}

/**
 * ゲーム制御フック
 * page.tsx内の制御状態を独立したフックとして抽出
 */
export const useGameControls = (config: GameControlsConfig = {}): GameControlsReturn => {
  const [isPlaying, setIsPlaying] = useState(config.initialIsPlaying ?? true);
  const [currentTurn, setCurrentTurn] = useState(config.initialCurrentTurn ?? -1);
  const [gameSpeed, setGameSpeed] = useState(config.initialGameSpeed ?? 1.0);

  // 再生/一時停止トグル（BattlePlaybackControls対応）
  const onPlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // ターン変更（自動一時停止ロジック付き）
  const onTurnChange = useCallback((turn: number) => {
    setCurrentTurn(turn);
    // 過去ターンに移動した場合は自動一時停止
    // この判定ロジックはBattlePlaybackControls.tsxの実装と一致
    if (isPlaying && turn !== -1) {
      setIsPlaying(false);
    }
  }, [isPlaying]);

  // 速度変更
  const onSpeedChange = useCallback((speed: number) => {
    setGameSpeed(speed);
  }, []);

  // 開始時点にジャンプ
  const onJumpToStart = useCallback(() => {
    setCurrentTurn(0);
    setIsPlaying(false); // 手動操作時は一時停止
  }, []);

  // 最新状態にジャンプ
  const onJumpToEnd = useCallback(() => {
    setCurrentTurn(-1);
    // 最新に戻った場合は再生状態を維持
  }, []);

  return {
    // 基本状態
    isPlaying,
    setIsPlaying,
    currentTurn,
    setCurrentTurn,
    gameSpeed,
    setGameSpeed,
    
    // コールバック関数
    onPlayPause,
    onTurnChange,
    onSpeedChange,
    onJumpToStart,
    onJumpToEnd,
  };
};
