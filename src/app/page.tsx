    /**
 * Ashenhall メインアプリケーション
 * 
 * 設計方針:
 * - GameSetup（勢力・戦術選択）とGameBoard（ゲーム画面）の切り替え
 * - AI対戦の統合とリアルタイム戦闘観戦
 * - シンプルな状態管理でMVP実現
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Faction, TacticsType, GameState, LocalStats, Card } from '@/types/game';
import { GAME_CONSTANTS } from '@/types/game';
import { getCardsByFaction } from '@/data/cards/base-cards';
import { createInitialGameState, processGameStep } from '@/lib/game-engine/core';
import { loadStats, saveStats, updateStatsWithGameResult } from '@/lib/stats-utils';
import GameSetup from '@/components/GameSetup';
import GameBoard from '@/components/GameBoard';
import { Zap, AlertCircle } from 'lucide-react';

type AppState = 'setup' | 'playing' | 'finished';

export default function Home() {
  const [appState, setAppState] = useState<AppState>('setup');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [localStats, setLocalStats] = useState<LocalStats | null>(null);
  
  // 新しいシンプルな状態管理
  const [isPlaying, setIsPlaying] = useState(true);     // 再生/一時停止
  const [currentTurn, setCurrentTurn] = useState(-1);   // 現在表示ターン (-1=最新)
  const [gameSpeed, setGameSpeed] = useState(1.0);      // 再生速度

  // 統計データを読み込む
  useEffect(() => {
    setLocalStats(loadStats());
  }, []);

  // AIデッキを生成する関数（勢力のカードから定数で定義された枚数を選択）
  const generateAIDeck = (faction: Faction): Card[] => {
    const factionCards = getCardsByFaction(faction);
    const deck: Card[] = [];
    let i = 0;
    while (deck.length < GAME_CONSTANTS.DECK_SIZE) {
      deck.push(factionCards[i % factionCards.length]);
      i++;
    }
    return deck;
  };

  // ゲーム開始処理
  const handleGameStart = (playerFaction: Faction, playerTactics: TacticsType, playerDeck: Card[]) => {
    // AI対戦相手の勢力と戦術をランダム選択
    const factions: Faction[] = ['necromancer', 'berserker', 'mage', 'knight', 'inquisitor'];
    const tactics: TacticsType[] = ['aggressive', 'defensive', 'tempo', 'balanced'];
    
    const aiFaction = factions[Math.floor(Math.random() * factions.length)];
    const aiTactics = tactics[Math.floor(Math.random() * tactics.length)];
    
    // AIデッキ生成
    const aiDeck = generateAIDeck(aiFaction);
    
    // ゲーム状態初期化
    const randomSeed = `game-${Date.now()}-${Math.random()}`;
    const initialState = createInitialGameState(
      `game-${Date.now()}`,
      playerDeck,
      aiDeck,
      playerFaction,
      aiFaction,
      playerTactics,
      aiTactics,
      randomSeed
    );
    
    setGameState(initialState);
    setAppState('playing');
    setIsPlaying(true);     // 自動再生開始
    setCurrentTurn(-1);     // 最新ターンに設定
  };

  // ゲーム進行処理（自動実行）
  useEffect(() => {
    if (!gameState || !isPlaying || gameState.result) {
      return;
    }

    // 過去ターン表示中の場合
    if (currentTurn !== -1 && currentTurn < gameState.turnNumber) {
      // 過去ターンから最新まで段階的に進行
      const timer = setTimeout(() => {
        const nextTurn = currentTurn + 1;
        if (nextTurn >= gameState.turnNumber) {
          // 最新に到達したらライブモードに戻る
          setCurrentTurn(-1);
        } else {
          // 次のターンに進む
          setCurrentTurn(nextTurn);
        }
      }, Math.max(200, 1000 / gameSpeed)); // 最小200ms、速度調整可能
      
      return () => clearTimeout(timer);
    }
    
    // 最新ターンの場合のみ実際のゲーム進行
    if (currentTurn === -1 || currentTurn >= gameState.turnNumber) {
      const processNextStep = () => {
        const nextState = processGameStep(gameState);
        setGameState(nextState);
        
        // ゲームが終了した場合
        if (nextState.result) {
          setIsPlaying(false);
          setAppState('finished');

          // 統計データを更新して保存
          if (localStats) {
            const updatedStats = updateStatsWithGameResult(localStats, nextState);
            saveStats(updatedStats);
            setLocalStats(updatedStats);
          }
        }
      };

      // フェーズ別の基本遅延時間
      const phaseDelays = {
        draw: 300,
        energy: 200,
        deploy: 800,
        battle: 1200,
        end: 300,
      };

      // 現在のフェーズに応じた遅延時間を計算
      const baseDelay = phaseDelays[gameState.phase] || 500;
      const adjustedDelay = Math.max(50, baseDelay / gameSpeed); // 最小50ms

      const timer = setTimeout(processNextStep, adjustedDelay);
      return () => clearTimeout(timer);
    }
  }, [gameState, isPlaying, currentTurn, gameSpeed, localStats]);

  // セットアップ画面に戻る
  const handleReturnToSetup = () => {
    setAppState('setup');
    setGameState(null);
    setIsPlaying(true);
    setCurrentTurn(-1);
  };

  // ゲーム状態に応じて表示を切り替え
  switch (appState) {
    case 'setup':
      return (
        <div className="relative min-h-screen">
          <GameSetup onGameStart={handleGameStart} stats={localStats} />
          <div className="absolute top-4 right-4">
            <Link href="/stats" className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
              戦績を見る
            </Link>
          </div>
        </div>
      );
    
    case 'playing':
    case 'finished':
      return gameState ? (
        <GameBoard 
          gameState={gameState} 
          onReturnToSetup={handleReturnToSetup}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          currentTurn={currentTurn}
          setCurrentTurn={setCurrentTurn}
          gameSpeed={gameSpeed}
          setGameSpeed={setGameSpeed}
        />
      ) : (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center">
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <Zap size={96} className="text-yellow-400 animate-pulse" />
            </div>
            <div className="text-xl font-bold">ゲームを準備中...</div>
          </div>
        </div>
      );
    
    default:
      return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center">
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <AlertCircle size={96} className="text-red-400" />
            </div>
            <div className="text-xl font-bold">エラーが発生しました</div>
            <button 
              onClick={handleReturnToSetup}
              className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
            >
              最初に戻る
            </button>
          </div>
        </div>
      );
  }
}
