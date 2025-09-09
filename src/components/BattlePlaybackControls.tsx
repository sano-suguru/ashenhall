/**
 * 戦闘再生コントロール - YouTube風プレイヤーUI
 * 
 * 設計方針:
 * - シンプルな再生/一時停止の統一概念
 * - スライダー操作で自動一時停止
 * - 直感的な操作フロー
 */

'use client';

import React from 'react';
import { 
  Play, 
  Pause, 
  SkipBack,
  SkipForward,
  Rewind,
  FastForward,
  RotateCcw,
  Zap
} from 'lucide-react';
import styles from '@/styles/components/BattlePlayback.module.css';

interface BattlePlaybackControlsProps {
  isPlaying: boolean;
  currentTurn: number;
  maxTurn: number;
  gameSpeed: number;
  onPlayPause: () => void;
  onTurnChange: (turn: number) => void;
  onSpeedChange: (speed: number) => void;
  onJumpToStart: () => void;
  onJumpToEnd: () => void;
  isGameFinished?: boolean;
}

// 利用可能な再生速度
const SPEED_OPTIONS = [0.25, 0.5, 1.0, 1.5, 2.0, 3.0];

export default function BattlePlaybackControls({
  isPlaying,
  currentTurn,
  maxTurn,
  gameSpeed,
  onPlayPause,
  onTurnChange,
  onSpeedChange,
  onJumpToStart,
  onJumpToEnd,
  isGameFinished = false,
}: BattlePlaybackControlsProps) {
  // スライダー変更時の処理（自動一時停止）
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTurn = parseInt(e.target.value);
    onTurnChange(newTurn);
  };

  // ステップ操作
  const handleStepBackward = () => {
    if (currentTurn > 0) {
      onTurnChange(Math.max(0, currentTurn - 1));
    }
  };

  const handleStepForward = () => {
    if (currentTurn < maxTurn) {
      onTurnChange(Math.min(maxTurn, currentTurn + 1));
    }
  };

  // 速度選択のハンドラ
  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSpeedChange(parseFloat(e.target.value));
  };

  // 現在のターン表示値（-1は最新として表示）
  const displayTurn = currentTurn === -1 ? maxTurn : currentTurn;

  return (
    <div className="bg-gray-800/90 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-white flex items-center space-x-2">
          <Zap size={20} className="text-amber-400" />
          <span>戦闘再生</span>
        </h3>
        
        {/* 状態表示 */}
        <div className="flex items-center space-x-3 text-sm">
          {isPlaying ? (
            <span className="bg-green-600 text-white px-2 py-1 rounded-full font-bold">
              再生中
            </span>
          ) : (
            <span className="bg-gray-600 text-white px-2 py-1 rounded-full font-bold">
              一時停止
            </span>
          )}
          
          {currentTurn !== -1 && currentTurn < maxTurn && (
            <span className="bg-blue-600 text-white px-2 py-1 rounded-full font-bold text-xs">
              過去表示中
            </span>
          )}
        </div>
      </div>

      {/* タイムライン情報 */}
      <div className="flex items-center justify-between mb-3 text-sm text-gray-400">
        <span>ターン {displayTurn}</span>
        <span>最大 {maxTurn}</span>
      </div>

      {/* メインタイムラインスライダー */}
      <div className="mb-4">
        <input
          type="range"
          min="0"
          max={maxTurn}
          value={displayTurn}
          onChange={handleSliderChange}
          className={`w-full h-3 bg-gray-600 rounded-lg appearance-none cursor-pointer ${styles.slider}`}
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(displayTurn / maxTurn) * 100}%, #4b5563 ${(displayTurn / maxTurn) * 100}%, #4b5563 100%)`
          }}
        />
        
        {/* スライダーの目盛り */}
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>開始</span>
          {maxTurn > 0 && (
            <>
              <span>T{Math.floor(maxTurn / 2)}</span>
              <span>T{maxTurn}</span>
            </>
          )}
        </div>
      </div>

      {/* 操作ボタン - 2行レイアウト */}
      <div className="space-y-3">
        {/* 上段: メイン操作ボタン */}
        <div className="flex items-center justify-center space-x-2">
          {/* 最初に戻る */}
          <button
            onClick={onJumpToStart}
            className="p-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
            title="ゲーム開始時に戻る"
          >
            <SkipBack size={16} className="text-white" />
          </button>
          
          {/* 1ターン戻る */}
          <button
            onClick={handleStepBackward}
            disabled={currentTurn <= 0}
            className="p-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
            title="1ターン戻る"
          >
            <Rewind size={16} className="text-white" />
          </button>

          {/* 再生/一時停止（メインボタン） */}
          <button
            onClick={onPlayPause}
            className={`p-3 rounded-lg transition-colors font-bold ${
              isPlaying 
                ? 'bg-yellow-600 hover:bg-yellow-500 text-white' 
                : 'bg-green-600 hover:bg-green-500 text-white'
            }`}
            title={isPlaying ? '一時停止' : '再生'}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>

          {/* 1ターン進む */}
          <button
            onClick={handleStepForward}
            disabled={currentTurn >= maxTurn}
            className="p-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
            title="1ターン進む"
          >
            <FastForward size={16} className="text-white" />
          </button>
          
          {/* 最新に進む */}
          <button
            onClick={onJumpToEnd}
            className="p-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
            title="最新状態に進む"
          >
            <SkipForward size={16} className="text-white" />
          </button>
        </div>

        {/* 下段: 速度選択 */}
        <div className="flex items-center justify-center space-x-2">
          <span className="text-sm text-gray-400">速度:</span>
          <select
            value={gameSpeed}
            onChange={handleSpeedChange}
            disabled={!isPlaying && !isGameFinished}
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:border-blue-400 focus:outline-none"
          >
            {SPEED_OPTIONS.map(speed => (
              <option key={speed} value={speed}>
                {speed}x
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ヘルプテキスト */}
      <div className="mt-3 text-xs text-gray-500 text-center">
        {isPlaying ? (
          currentTurn === -1 ? (
            <span>⏹️ スライダーを動かすと自動的に一時停止します</span>
          ) : (
            <span>🔄 最新まで自動再生中...</span>
          )
        ) : (
          <span>▶️ 再生ボタンで最新状態まで自動再生 | スライダーで任意のターンを確認</span>
        )}
      </div>
    </div>
  );
}
