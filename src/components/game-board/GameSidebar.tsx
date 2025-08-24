'use client';

import React from 'react';
import type { GameState } from '@/types/game';
import BattlePlaybackControls from '../BattlePlaybackControls';
import { generateBattleReport, generateShareableText } from '@/lib/game-state-utils';
import { Handshake, ScrollText, Share, Trophy, X, FileText } from 'lucide-react';

interface GameSidebarProps {
  gameState: GameState;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTurn: number;
  setCurrentTurn: (turn: number) => void;
  gameSpeed: number;
  setGameSpeed: (speed: number) => void;
  onShowDetailedLog: () => void;
  onReturnToSetup: () => void;
}

const GameSidebar: React.FC<GameSidebarProps> = ({
  gameState,
  isPlaying,
  setIsPlaying,
  currentTurn,
  setCurrentTurn,
  gameSpeed,
  setGameSpeed,
  onShowDetailedLog,
  onReturnToSetup,
}) => {
  const handleGenerateReport = () => {
    const report = generateBattleReport(gameState);
    navigator.clipboard.writeText(report).then(() => {
      alert('戦闘レポートをクリップボードにコピーしました！');
    }).catch(() => {
      alert('クリップボードへのコピーに失敗しました。');
    });
  };

  const handleShareResult = () => {
    const shareText = generateShareableText(gameState);
    navigator.clipboard.writeText(shareText).then(() => {
      alert('共有用テキストをクリップボードにコピーしました！');
    }).catch(() => {
      alert(shareText);
    });
  };

  return (
    <div className="lg:col-span-1 space-y-4">
      {gameState.result && (
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-4 border border-purple-400">
          <h3 className="text-xl font-bold mb-2 text-center">ゲーム終了</h3>
          <div className="text-center space-y-2">
            <div className="text-2xl font-bold flex items-center justify-center space-x-2">
              {gameState.result.winner === 'player1' ? (
                <><Trophy className="text-yellow-400" size={24} /> <span>あなたの勝利!</span></>
              ) : gameState.result.winner === 'player2' ? (
                <><X className="text-red-400" size={24} /> <span>相手の勝利</span></>
              ) : (
                <><Handshake className="text-blue-400" size={24} /> <span>引き分け</span></>
              )}
            </div>
            <div className="text-sm text-gray-200">
              理由: {gameState.result.reason === 'life_zero' ? 'ライフ0' : gameState.result.reason}
            </div>
            <button
              onClick={onReturnToSetup}
              className="mt-4 px-4 py-2 bg-white text-purple-600 font-bold rounded-lg hover:bg-gray-100 transition-colors"
            >
              新しいゲーム
            </button>
          </div>
        </div>
      )}

      <BattlePlaybackControls
        isPlaying={isPlaying}
        currentTurn={currentTurn}
        maxTurn={gameState.turnNumber}
        gameSpeed={gameSpeed}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        onTurnChange={(turn) => {
          setCurrentTurn(turn);
          if (isPlaying && turn < gameState.turnNumber) {
            setIsPlaying(false);
          }
        }}
        onSpeedChange={setGameSpeed}
        onJumpToStart={() => setCurrentTurn(0)}
        onJumpToEnd={() => setCurrentTurn(-1)}
        isGameFinished={!!gameState.result}
      />

      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-bold mb-3">戦闘分析</h3>
        <div className="space-y-3">
          <button
            onClick={onShowDetailedLog}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors text-white"
          >
            <ScrollText size={16} />
            <span>詳細ログを見る</span>
          </button>
          
          {gameState.result && (
            <>
              <button
                onClick={handleGenerateReport}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg transition-colors text-white"
              >
                <FileText size={16} />
                <span>戦闘レポート</span>
              </button>
              
              <button
                onClick={handleShareResult}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors text-white"
              >
                <Share size={16} />
                <span>結果を共有</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameSidebar;
