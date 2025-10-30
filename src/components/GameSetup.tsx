/**
 * ゲーム開始画面 - 分割後のメインコンポーネント
 *
 * 設計方針:
 * - 各責務を専用コンポーネントに分離
 * - GameSetupProviderでState管理を統合
 * - UIの構成とレイアウトに専念
 */

'use client';

import type { Faction, LocalStats, Card } from '@/types/game';
import NoSSR from '@/components/NoSSR';
import DeckBuilder from './DeckBuilder';
import GameStatsDisplay from './GameStatsDisplay';
import { GameSetupProvider, useGameSetup } from './game-setup/GameSetupProvider';
// 統合により外部コンポーネント依存を削除
// 旧GameSetupConstants.tsから統合
import { Skull, Zap, Sparkles, Shield, Eye, PlusCircle, Edit, Cloud } from 'lucide-react';
import { FACTION_DESCRIPTIONS, GAME_CONSTANTS } from '@/types/game';
import { validateDeck } from '@/lib/deck-utils';
import { useMemo, useState } from 'react';
import OnlineDeckManager from './OnlineDeckManager';
import { useAuth } from '@/hooks/useAuth';

// === 統合された定数定義（旧GameSetupConstants.tsから） ===

// 勢力の表示データ
export const FACTION_DATA = {
  necromancer: {
    name: '死霊術師',
    color: 'from-purple-950 to-gray-950',
    icon: Skull,
    description: FACTION_DESCRIPTIONS.necromancer,
  },
  berserker: {
    name: '戦狂い',
    color: 'from-red-950 to-stone-950',
    icon: Zap,
    description: FACTION_DESCRIPTIONS.berserker,
  },
  mage: {
    name: '魔導士',
    color: 'from-indigo-950 to-slate-950',
    icon: Sparkles,
    description: FACTION_DESCRIPTIONS.mage,
  },
  knight: {
    name: '騎士',
    color: 'from-amber-950 to-stone-950',
    icon: Shield,
    description: FACTION_DESCRIPTIONS.knight,
  },
  inquisitor: {
    name: '審問官',
    color: 'from-slate-950 to-zinc-950',
    icon: Eye,
    description: FACTION_DESCRIPTIONS.inquisitor,
  },
} as const;

// 選択カードの共通スタイル
const getSelectionCardStyle = (isSelected: boolean) => `
  relative cursor-pointer p-6 rounded-2xl border transition-all duration-300 group hover:scale-[1.02] backdrop-blur-sm
  ${
    isSelected
      ? 'border-amber-400/60 bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-transparent shadow-2xl shadow-amber-400/25'
      : 'border-white/15 hover:border-amber-300/40 bg-gradient-to-br from-white/8 via-white/4 to-transparent hover:shadow-2xl hover:shadow-white/10'
  }
`;

interface GameSetupProps {
  onGameStart: (faction: Faction, deck: Card[]) => void;
  stats: LocalStats | null;
}

// === 統合された内部コンポーネント（旧game-setup/ディレクトリから） ===

// 勢力選択コンポーネント（旧FactionSelection.tsxから統合）
function FactionSelection({
  selectedFaction,
  onFactionSelect,
}: {
  selectedFaction: Faction | null;
  onFactionSelect: (faction: Faction) => void;
}) {
  return (
    <section>
      <h2 className="text-5xl font-bold text-center mb-12 text-amber-300 font-serif">勢力選択</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {Object.entries(FACTION_DATA).map(([faction, data]) => (
          <div
            key={faction}
            className={getSelectionCardStyle(selectedFaction === faction)}
            onClick={() => onFactionSelect(faction as Faction)}
          >
            <div className="text-center">
              <div className="mb-4 text-amber-400 flex justify-center group-hover:scale-110 transition-transform">
                <data.icon size={48} strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold mb-2 text-white font-serif">{data.name}</h3>
              <p className="text-sm text-gray-400 font-serif leading-relaxed">{data.description}</p>
            </div>

            {selectedFaction === faction && (
              <div className="absolute -top-2 -right-2">
                <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                  <span className="text-black text-sm font-bold">✓</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// デッキ管理コンポーネント（旧DeckManagement.tsxから統合）
function DeckManagement({
  selectedFaction,
  deckCollection,
  activeDeckId,
  onCreateNewDeck,
  onEditDeck,
  onSetActiveDeck,
}: {
  selectedFaction: Faction | null;
  deckCollection: import('@/types/game').DeckCollection;
  activeDeckId?: string;
  onCreateNewDeck: () => void;
  onEditDeck: (deck: import('@/types/game').CustomDeck) => void;
  onSetActiveDeck: (deckId: string) => void;
}) {
  const [showOnlineManager, setShowOnlineManager] = useState(false);
  const { isAuthenticated } = useAuth();

  const factionDecks = useMemo(() => {
    if (!selectedFaction) return [];
    return deckCollection.decks.filter((d) => d.faction === selectedFaction);
  }, [deckCollection.decks, selectedFaction]);

  const handleLoadOnlineDeck = (deck: import('@/types/game').CustomDeck) => {
    onEditDeck(deck);
  };

  if (!selectedFaction) {
    return null;
  }

  return (
    <section className="animate-fade-in">
      <div className="flex items-center justify-center mb-12">
        <h2 className="text-5xl font-bold text-amber-300 font-serif">デッキ選択</h2>
        {isAuthenticated && (
          <button
            onClick={() => setShowOnlineManager(true)}
            className="ml-4 flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm"
          >
            <Cloud size={18} />
            <span>オンラインデッキ</span>
          </button>
        )}
      </div>
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {factionDecks.map((deck) => {
          const validation = validateDeck(deck);
          return (
            <div
              key={deck.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                activeDeckId === deck.id
                  ? 'border-amber-400 bg-amber-500/10'
                  : 'border-gray-700 bg-gray-800/50'
              }`}
            >
              <h4 className="font-bold text-lg">{deck.name}</h4>
              <p className="text-sm text-gray-400">
                {deck.cards.length} / {GAME_CONSTANTS.DECK_SIZE} 枚
              </p>
              {!validation.isValid && (
                <p className="text-xs text-red-400 mt-1">{validation.errors[0]}</p>
              )}
              <div className="mt-4 flex space-x-2">
                <button
                  onClick={() => onSetActiveDeck(deck.id)}
                  disabled={activeDeckId === deck.id || !validation.isValid}
                  className="flex-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded disabled:bg-gray-500 text-sm transition-colors"
                >
                  {activeDeckId === deck.id ? '選択中' : '選択'}
                </button>
                <button
                  onClick={() => onEditDeck(deck)}
                  className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
                >
                  <Edit size={16} />
                </button>
              </div>
            </div>
          );
        })}
        <button
          onClick={onCreateNewDeck}
          className="p-4 rounded-lg border-2 border-dashed border-gray-600 hover:border-amber-400 hover:text-amber-400 transition-all flex flex-col items-center justify-center text-gray-500"
        >
          <PlusCircle size={32} />
          <span className="mt-2 font-bold">新しいデッキを作成</span>
        </button>
      </div>

      {selectedFaction && (
        <div className="text-center mt-8">
          <p className="text-gray-400 text-sm">
            {FACTION_DATA[selectedFaction].name}のデッキを管理できます
          </p>
        </div>
      )}

      {showOnlineManager && (
        <OnlineDeckManager
          onClose={() => setShowOnlineManager(false)}
          onLoadDeck={handleLoadOnlineDeck}
          currentDeck={activeDeckId ? factionDecks.find((d) => d.id === activeDeckId) : undefined}
        />
      )}
    </section>
  );
}

// ゲームルール表示コンポーネント（旧GameRules.tsxから統合）
function GameRules() {
  return (
    <section className="relative z-10">
      <h2 className="text-5xl font-bold text-center mb-16 text-transparent bg-gradient-to-b from-amber-200 via-amber-300 to-amber-500 bg-clip-text font-serif">
        基本ルール
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* デッキ構成 */}
        <div className="p-8 bg-gradient-to-br from-white/10 via-white/5 to-transparent rounded-2xl border border-white/20 backdrop-blur-sm shadow-2xl hover:shadow-amber-400/10 transition-all duration-300 group">
          <h3 className="text-2xl font-bold text-amber-300 mb-6 text-center font-serif group-hover:text-amber-200 transition-colors">
            デッキ構成
          </h3>
          <div className="space-y-4 text-gray-200">
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="font-serif">デッキサイズ</span>
              <span className="text-amber-300 font-bold">{GAME_CONSTANTS.DECK_SIZE}枚</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="font-serif">初期ライフ</span>
              <span className="text-amber-300 font-bold">{GAME_CONSTANTS.INITIAL_LIFE}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="font-serif">場の上限</span>
              <span className="text-amber-300 font-bold">{GAME_CONSTANTS.FIELD_LIMIT}体</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="font-serif">エネルギー上限</span>
              <span className="text-amber-300 font-bold">{GAME_CONSTANTS.ENERGY_LIMIT}</span>
            </div>
          </div>
        </div>

        {/* 勝利条件 */}
        <div className="p-8 bg-gradient-to-br from-white/10 via-white/5 to-transparent rounded-2xl border border-white/20 backdrop-blur-sm shadow-2xl hover:shadow-amber-400/10 transition-all duration-300 group">
          <h3 className="text-2xl font-bold text-amber-300 mb-6 text-center font-serif group-hover:text-amber-200 transition-colors">
            勝利条件
          </h3>
          <div className="space-y-4 text-gray-200 text-center">
            <div className="p-4 bg-gradient-to-br from-amber-500/10 to-transparent rounded-xl border border-amber-400/20">
              <p className="font-semibold text-amber-200 mb-2 font-serif">主要勝利</p>
              <p className="text-sm">相手のライフを0にする</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-amber-500/10 to-transparent rounded-xl border border-amber-400/20">
              <p className="font-semibold text-amber-200 mb-2 font-serif">時間切れ勝利</p>
              <p className="text-sm">30ターン経過時にライフが多い方</p>
            </div>
          </div>
        </div>

        {/* ゲームの流れ */}
        <div className="p-8 bg-gradient-to-br from-white/10 via-white/5 to-transparent rounded-2xl border border-white/20 backdrop-blur-sm shadow-2xl hover:shadow-amber-400/10 transition-all duration-300 group">
          <h3 className="text-2xl font-bold text-amber-300 mb-6 text-center font-serif group-hover:text-amber-200 transition-colors">
            ゲームの流れ
          </h3>
          <div className="space-y-4 text-gray-200">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-black text-sm font-bold shadow-lg">
                1
              </div>
              <p className="text-sm font-serif">戦術でカード自動配置</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-black text-sm font-bold shadow-lg">
                2
              </div>
              <p className="text-sm font-serif">戦闘は自動進行</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-black text-sm font-bold shadow-lg">
                3
              </div>
              <p className="text-sm font-serif">結果を観戦して楽しむ</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ゲーム開始確認セクション
function GameStartSection({
  onGameStart,
}: {
  onGameStart: (faction: Faction, deck: Card[]) => void;
}) {
  const { selectedFaction, activeDeckId, handleStart } = useGameSetup();

  if (!selectedFaction || !activeDeckId) {
    return null;
  }

  return (
    <section className="text-center animate-fade-in relative z-10">
      <div className="mb-10 p-6 bg-gradient-to-br from-amber-500/15 via-amber-400/10 to-transparent rounded-2xl border border-amber-400/40 max-w-md mx-auto backdrop-blur-sm shadow-2xl shadow-amber-400/20">
        <div className="text-amber-200 font-serif font-bold text-lg mb-2">選択された勢力</div>
        <div className="text-amber-300 font-serif font-bold text-2xl">
          {FACTION_DATA[selectedFaction].name}
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
    deckCollection,
    editingDeck,
    activeDeckId,
    setSelectedFaction,
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
