/**
 * ゲーム開始画面 - 分割後のメインコンポーネント
 * 
 * 設計方針:
 * - 各責務を専用コンポーネントに分離
 * - GameSetupProviderでState管理を統合
 * - UIの構成とレイアウトに専念
 */

'use client';

import type { Faction, TacticsType, LocalStats, Card } from '@/types/game';
import NoSSR from '@/components/NoSSR';
import DeckBuilder from './DeckBuilder';
import GameStatsDisplay from './GameStatsDisplay';
import { GameSetupProvider, useGameSetup } from './game-setup/GameSetupProvider';
import FactionSelection from './game-setup/FactionSelection';
import DeckManagement from './game-setup/DeckManagement';
import TacticsSelection from './game-setup/TacticsSelection';
import GameRules from './game-setup/GameRules';
import { FACTION_DATA, TACTICS_DATA } from './game-setup/GameSetupConstants';

interface GameSetupProps {
  onGameStart: (faction: Faction, tactics: TacticsType, deck: Card[]) => void;
  stats: LocalStats | null;
}

// ゲーム開始確認セクション
function GameStartSection({ onGameStart }: { onGameStart: (faction: Faction, tactics: TacticsType, deck: Card[]) => void }) {
  const { 
    selectedFaction, 
    selectedTactics, 
    activeDeckId, 
    handleStart 
  } = useGameSetup();

  if (!selectedFaction || !selectedTactics || !activeDeckId) {
    return null;
  }

  return (
    <section className="text-center animate-fade-in relative z-10">
      <div className="mb-10 p-6 bg-gradient-to-br from-amber-500/15 via-amber-400/10 to-transparent rounded-2xl border border-amber-400/40 max-w-md mx-auto backdrop-blur-sm shadow-2xl shadow-amber-400/20">
        <div className="text-amber-200 font-serif font-bold text-lg mb-2">
          選択された組み合わせ
        </div>
        <div className="text-amber-300 font-serif font-bold text-xl">
          {FACTION_DATA[selectedFaction].name}
        </div>
        <div className="text-amber-400/80 font-serif text-lg mb-1">×</div>
        <div className="text-amber-300 font-serif font-bold text-xl">
          {TACTICS_DATA[selectedTactics].name}
        </div>
      </div>
      
      <button
        onClick={() => handleStart(onGameStart)}
        className="relative px-20 py-5 text-2xl font-bold font-serif tracking-wide rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:via-amber-400 hover:to-amber-500 text-black shadow-2xl hover:shadow-amber-400/40 hover:scale-105 transition-all duration-300 border-2 border-amber-400/50 overflow-hidden group"
      >
        <span className="relative z-10">バトル開始</span>
        {/* シマー効果 */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
      </button>
    </section>
  );
}

// メインコンポーネント内部（Provider内で動作）
function GameSetupContent({ onGameStart, stats }: GameSetupProps) {
  const {
    selectedFaction,
    selectedTactics,
    deckCollection,
    editingDeck,
    activeDeckId,
    setSelectedFaction,
    setSelectedTactics,
    handleCreateNewDeck,
    handleSaveDeck,
    handleDeleteDeck,
    handleSetActiveDeck,
    setEditingDeck,
  } = useGameSetup();

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-900 to-black text-white p-6 relative overflow-hidden">
        {/* 背景装飾 */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-purple-500/5 -z-10"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl -z-10"></div>
        
        {/* タイトル */}
        <header className="text-center mb-24 relative z-10">
          <div className="relative">
            {/* メインタイトル */}
            <h1 className="text-9xl font-bold mb-6 text-transparent bg-gradient-to-b from-amber-200 via-amber-300 to-amber-500 bg-clip-text font-serif tracking-wider relative">
              ASHENHALL
              {/* グロー効果 */}
              <div className="absolute inset-0 text-9xl font-bold font-serif tracking-wider text-amber-300/20 blur-lg">
                ASHENHALL
              </div>
            </h1>
            
            {/* ゲーム説明 */}
            <div className="mb-6">
              <p className="text-lg text-gray-300">
                時間を選ばない戦略体験 - いつでも対戦申請、結果は後で確認
              </p>
            </div>
            
            {/* サブタイトル装飾 */}
            <div className="flex items-center justify-center mb-8 relative">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-amber-400/60 max-w-20"></div>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent via-amber-500/30 to-amber-400/60 max-w-20"></div>
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto space-y-16">
          {/* 戦績表示 */}
          <section>
            <GameStatsDisplay stats={stats} />
          </section>

          {/* 勢力選択 */}
          <FactionSelection 
            selectedFaction={selectedFaction}
            onFactionSelect={setSelectedFaction}
          />

          {/* デッキ選択 */}
          {selectedFaction && (
            <DeckManagement
              selectedFaction={selectedFaction}
              deckCollection={deckCollection}
              activeDeckId={activeDeckId}
              onCreateNewDeck={handleCreateNewDeck}
              onEditDeck={setEditingDeck}
              onSetActiveDeck={handleSetActiveDeck}
            />
          )}

          {/* 戦術選択 */}
          {selectedFaction && activeDeckId && (
            <TacticsSelection
              selectedTactics={selectedTactics}
              onTacticsSelect={setSelectedTactics}
            />
          )}

          {/* ゲーム開始 */}
          <GameStartSection onGameStart={onGameStart} />

          {/* 基本ルール */}
          <GameRules />
        </div>
      </div>

      {/* デッキ編集モーダル */}
      {editingDeck && (
        <DeckBuilder
          deck={editingDeck}
          onSave={handleSaveDeck}
          onDelete={handleDeleteDeck}
          onClose={() => setEditingDeck(null)}
        />
      )}
    </>
  );
}

// 外部公開コンポーネント（Providerでラップ）
export default function GameSetup({ onGameStart, stats }: GameSetupProps) {
  return (
    <NoSSR>
      <GameSetupProvider>
        <GameSetupContent onGameStart={onGameStart} stats={stats} />
      </GameSetupProvider>
    </NoSSR>
  );
}
