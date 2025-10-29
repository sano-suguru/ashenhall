/**
 * useGameControls フック ユニットテスト
 *
 * テスト方針:
 * - 基本的な状態管理の動作確認
 * - BattlePlaybackControlsとの連携インターフェース検証
 * - 自動一時停止ロジックの動作確認
 */

import { renderHook, act } from '@testing-library/react';
import { useGameControls, type GameControlsConfig } from '@/hooks/useGameControls';

describe('useGameControls', () => {
  describe('初期化', () => {
    test('デフォルト値で正しく初期化される', () => {
      const { result } = renderHook(() => useGameControls());

      expect(result.current.isPlaying).toBe(true);
      expect(result.current.currentTurn).toBe(-1);
      expect(result.current.gameSpeed).toBe(1.0);
    });

    test('設定値で正しく初期化される', () => {
      const config: GameControlsConfig = {
        initialIsPlaying: false,
        initialCurrentTurn: 5,
        initialGameSpeed: 2.0,
      };

      const { result } = renderHook(() => useGameControls(config));

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.currentTurn).toBe(5);
      expect(result.current.gameSpeed).toBe(2.0);
    });
  });

  describe('基本状態管理', () => {
    test('isPlayingの状態変更が正常動作', () => {
      const { result } = renderHook(() => useGameControls());

      expect(result.current.isPlaying).toBe(true);

      act(() => {
        result.current.setIsPlaying(false);
      });

      expect(result.current.isPlaying).toBe(false);

      act(() => {
        result.current.setIsPlaying(true);
      });

      expect(result.current.isPlaying).toBe(true);
    });

    test('currentTurnの設定・取得が正常動作', () => {
      const { result } = renderHook(() => useGameControls());

      expect(result.current.currentTurn).toBe(-1);

      act(() => {
        result.current.setCurrentTurn(3);
      });

      expect(result.current.currentTurn).toBe(3);

      act(() => {
        result.current.setCurrentTurn(0);
      });

      expect(result.current.currentTurn).toBe(0);
    });

    test('gameSpeedの変更が正常動作', () => {
      const { result } = renderHook(() => useGameControls());

      expect(result.current.gameSpeed).toBe(1.0);

      act(() => {
        result.current.setGameSpeed(2.5);
      });

      expect(result.current.gameSpeed).toBe(2.5);

      act(() => {
        result.current.setGameSpeed(0.5);
      });

      expect(result.current.gameSpeed).toBe(0.5);
    });
  });

  describe('コールバック関数', () => {
    test('onPlayPause()が状態を正しく反転', () => {
      const { result } = renderHook(() => useGameControls());

      expect(result.current.isPlaying).toBe(true);

      act(() => {
        result.current.onPlayPause();
      });

      expect(result.current.isPlaying).toBe(false);

      act(() => {
        result.current.onPlayPause();
      });

      expect(result.current.isPlaying).toBe(true);
    });

    test('onTurnChange()の基本動作', () => {
      const { result } = renderHook(() => useGameControls());

      act(() => {
        result.current.onTurnChange(5);
      });

      expect(result.current.currentTurn).toBe(5);
    });

    test('onTurnChange()の自動一時停止ロジック', () => {
      const { result } = renderHook(() => useGameControls());

      // 初期状態: 再生中、最新ターン表示
      expect(result.current.isPlaying).toBe(true);
      expect(result.current.currentTurn).toBe(-1);

      // 過去ターン（-1以外）に移動すると自動一時停止
      act(() => {
        result.current.onTurnChange(3);
      });

      expect(result.current.currentTurn).toBe(3);
      expect(result.current.isPlaying).toBe(false);
    });

    test('onSpeedChange()が正しく動作', () => {
      const { result } = renderHook(() => useGameControls());

      act(() => {
        result.current.onSpeedChange(3.0);
      });

      expect(result.current.gameSpeed).toBe(3.0);
    });

    test('onJumpToStart()が正しく動作', () => {
      const { result } = renderHook(() => useGameControls());

      act(() => {
        result.current.onJumpToStart();
      });

      expect(result.current.currentTurn).toBe(0);
      expect(result.current.isPlaying).toBe(false);
    });

    test('onJumpToEnd()が正しく動作', () => {
      const { result } = renderHook(() => useGameControls());

      // 過去ターンから開始
      act(() => {
        result.current.setCurrentTurn(5);
        result.current.setIsPlaying(false);
      });

      act(() => {
        result.current.onJumpToEnd();
      });

      expect(result.current.currentTurn).toBe(-1);
      // isPlayingは変更されない（最新に戻った時の仕様）
    });
  });

  describe('境界値・例外処理', () => {
    test('負の値での動作', () => {
      const { result } = renderHook(() => useGameControls());

      act(() => {
        result.current.setCurrentTurn(-5);
        result.current.setGameSpeed(-1);
      });

      // 負の値も許容（上位コンポーネントでの制御想定）
      expect(result.current.currentTurn).toBe(-5);
      expect(result.current.gameSpeed).toBe(-1);
    });

    test('極端な値での動作', () => {
      const { result } = renderHook(() => useGameControls());

      act(() => {
        result.current.setCurrentTurn(999);
        result.current.setGameSpeed(100);
      });

      expect(result.current.currentTurn).toBe(999);
      expect(result.current.gameSpeed).toBe(100);
    });
  });

  describe('メモ化の動作確認', () => {
    test('コールバック関数の参照安定性', () => {
      const { result, rerender } = renderHook(() => useGameControls());

      const initialCallbacks = {
        onPlayPause: result.current.onPlayPause,
        onTurnChange: result.current.onTurnChange,
        onSpeedChange: result.current.onSpeedChange,
        onJumpToStart: result.current.onJumpToStart,
        onJumpToEnd: result.current.onJumpToEnd,
      };

      // 状態変更
      act(() => {
        result.current.setGameSpeed(2.0);
      });

      rerender();

      // onSpeedChangeとonJumpToEnd以外は参照が変わらない
      expect(result.current.onPlayPause).toBe(initialCallbacks.onPlayPause);
      expect(result.current.onSpeedChange).toBe(initialCallbacks.onSpeedChange);
      expect(result.current.onJumpToStart).toBe(initialCallbacks.onJumpToStart);
      expect(result.current.onJumpToEnd).toBe(initialCallbacks.onJumpToEnd);
    });
  });
});
