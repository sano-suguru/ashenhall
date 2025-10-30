/**
 * Ashenhall メインアプリケーション
 *
 * 設計方針:
 * - GameSetup（勢力・戦術選択）とGameBoard（ゲーム画面）の切り替え
 * - AI対戦の統合とリアルタイム戦闘観戦
 * - シンプルな状態管理でMVP実現
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Faction, GameState, Card } from '@/types/game';
import { GAME_CONSTANTS } from '@/types/game';
import { getCardsByFaction } from '@/data/cards/base-cards';
import { createInitialGameState } from '@/lib/game-engine/core';
import GameSetup from '@/components/GameSetup';
import GameBoard from '@/components/GameBoard';
import UserMenu from '@/components/UserMenu';
import { useGameControls } from '@/hooks/useGameControls';
import { useLocalStats } from '@/hooks/useLocalStats';
import { useSequentialGameProgress } from '@/hooks/useSequentialGameProgress';
import { Zap, AlertCircle } from 'lucide-react';

type AppState = 'setup' | 'playing' | 'finished';

export default function Home() {
  const [appState, setAppState] = useState<AppState>('setup');
  const [gameState, setGameState] = useState<GameState | null>(null);

  // フック責務分離
  const gameControls = useGameControls();
  const localStats = useLocalStats();

  // useGameProgress用の安定化されたconfig（Phase C: 状態管理統一準備）
  const gameProgressConfig = useMemo(
    () => ({
      gameState,
      isPlaying: gameControls.isPlaying,
      currentTurn: gameControls.currentTurn,
      gameSpeed: gameControls.gameSpeed,
      onGameStateChange: setGameState,
      onGameFinished: () => {
        gameControls.setIsPlaying(false);
        setAppState('finished');
      },
      onStatsUpdate: localStats.updateWithGameResult,
    }),
    [
      gameState,
      gameControls, // Phase C: オブジェクト全体で安定性確保
      localStats.updateWithGameResult,
    ]
  );

  // useSequentialGameProgressに統一（Phase C: 状態管理統一完了）
  const gameProgress = useSequentialGameProgress(gameProgressConfig);

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
  const handleGameStart = (playerFaction: Faction, playerDeck: Card[]) => {
    // AI対戦相手の勢力をランダム選択
    const factions: Faction[] = ['necromancer', 'berserker', 'mage', 'knight', 'inquisitor'];
    const aiFaction = factions[Math.floor(Math.random() * factions.length)];

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
      randomSeed
    );

    setGameState(initialState);
    setAppState('playing');

    // ゲーム制御の初期化
    gameControls.setIsPlaying(true);
    gameControls.setCurrentTurn(-1);
  };

  // セットアップ画面に戻る
  const handleReturnToSetup = () => {
    setAppState('setup');
    setGameState(null);
    gameControls.setIsPlaying(true);
    gameControls.setCurrentTurn(-1);
  };

  // ゲーム状態に応じて表示を切り替え
  switch (appState) {
    case 'setup':
      return (
        <div className="relative min-h-screen">
          <GameSetup onGameStart={handleGameStart} stats={localStats.localStats} />
          <div className="absolute top-4 right-4 z-50 flex items-center space-x-4">
            <UserMenu />
            <Link
              href="/stats"
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              戦績を見る
            </Link>
          </div>
        </div>
      );

    case 'playing':
    case 'finished':
      return gameState ? (
        <GameBoard
          gameState={gameProgress.displayState || gameState}
          onReturnToSetup={handleReturnToSetup}
          isPlaying={gameControls.isPlaying}
          setIsPlaying={gameControls.setIsPlaying}
          currentTurn={gameControls.currentTurn}
          setCurrentTurn={gameControls.setCurrentTurn}
          gameSpeed={gameControls.gameSpeed}
          setGameSpeed={gameControls.setGameSpeed}
          currentAttackAction={gameProgress.currentAttackAction}
          getCardAnimationState={gameProgress.getCardAnimationState}
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
