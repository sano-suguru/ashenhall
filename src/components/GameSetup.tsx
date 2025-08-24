/**
 * ゲーム開始画面 - 勢力選択と戦術選択
 * 
 * 設計方針:
 * - シンプルで直感的なUI
 * - プレースホルダー画像で各勢力の特色表現
 * - 戦術説明でゲーム性を理解促進
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Faction, TacticsType, LocalStats, DeckCollection, CustomDeck, Card } from '@/types/game';
import { FACTION_DESCRIPTIONS, GAME_CONSTANTS } from '@/types/game';
import NoSSR from '@/components/NoSSR';
import DeckBuilder from './DeckBuilder';
import GameStatsDisplay from './GameStatsDisplay';
import { 
  loadDeckCollection, 
  saveDeckCollection, 
  createNewDeck,
  addDeckToCollection,
  updateDeckInCollection,
  deleteDeckFromCollection,
  setActiveDeckForFaction,
  validateDeck
} from '@/lib/deck-utils';
import { decodeDeck } from '@/lib/deck-sharing';
import { getCardById } from '@/data/cards/base-cards';
import { sampleDecks } from '@/data/decks/sample-decks';
import { 
  Skull, 
  Zap, 
  Sparkles, 
  Shield, 
  Eye,
  Sword,
  ShieldCheck,
  Gauge,
  Scale,
  PlusCircle,
  Edit
} from 'lucide-react';

interface GameSetupProps {
  onGameStart: (faction: Faction, tactics: TacticsType, deck: Card[]) => void;
  stats: LocalStats | null;
}

// 勢力の表示データ
const FACTION_DATA = {
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

// 戦術タイプの説明
const TACTICS_DATA = {
  aggressive: {
    name: '攻撃重視',
    description: '攻撃力の高いカードを優先配置。短期決戦で敵を圧倒する戦術。',
    icon: Sword,
  },
  defensive: {
    name: '守備重視',
    description: '体力・防御効果の高いカードを優先。持久戦に持ち込む安定戦術。',
    icon: ShieldCheck,
  },
  tempo: {
    name: '速攻重視',
    description: '低コストカードで早期展開。素早い攻勢で優位に立つ戦術。',
    icon: Gauge,
  },
  balanced: {
    name: 'バランス',
    description: 'コスト効率を重視したバランス型。状況に応じて柔軟に対応する戦術。',
    icon: Scale,
  },
} as const;

export default function GameSetup({ onGameStart, stats }: GameSetupProps) {
  const [selectedFaction, setSelectedFaction] = useState<Faction | null>(null);
  const [selectedTactics, setSelectedTactics] = useState<TacticsType | null>(null);
  const [deckCollection, setDeckCollection] = useState<DeckCollection>({ decks: [], activeDeckIds: {} });
  const [editingDeck, setEditingDeck] = useState<CustomDeck | null>(null);

  useEffect(() => {
    // URLからデッキコードを読み込む
    const urlParams = new URLSearchParams(window.location.search);
    const deckCode = urlParams.get('deck');
    if (deckCode) {
      const decodedData = decodeDeck(deckCode);
      if (decodedData) {
        const newDeck = createNewDeck(
          loadDeckCollection(), // 一時的なコレクション
          `インポートされたデッキ`,
          decodedData.faction
        );
        newDeck.cards = decodedData.cards;
        newDeck.coreCardIds = decodedData.coreCardIds;
        setEditingDeck(newDeck);
        // URLからクエリパラメータを削除してリロードを防ぐ
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    let collection = loadDeckCollection();
    // If there are no decks at all, populate with sample decks.
    if (collection.decks.length === 0) {
      sampleDecks.forEach(sampleDeck => {
        const newDeck = createNewDeck(collection, sampleDeck.name, sampleDeck.faction);
        newDeck.cards = [...sampleDeck.cardIds];
        newDeck.coreCardIds = sampleDeck.coreCardIds ? [...sampleDeck.coreCardIds] : [];
        collection = addDeckToCollection(collection, newDeck);
        collection = setActiveDeckForFaction(collection, sampleDeck.faction, newDeck.id);
      });
      saveDeckCollection(collection);
    }
    setDeckCollection(collection);
  }, []);

  const factionDecks = useMemo(() => {
    if (!selectedFaction) return [];
    return deckCollection.decks.filter(d => d.faction === selectedFaction);
  }, [deckCollection.decks, selectedFaction]);

  const activeDeckId = selectedFaction ? deckCollection.activeDeckIds[selectedFaction] : undefined;

  const handleSaveDeck = (deckToSave: CustomDeck) => {
    const existingDeck = deckCollection.decks.find(d => d.id === deckToSave.id);
    let newCollection;
    if (existingDeck) {
      newCollection = updateDeckInCollection(deckCollection, deckToSave);
    } else {
      newCollection = addDeckToCollection(deckCollection, deckToSave);
    }
    saveDeckCollection(newCollection);
    setDeckCollection(newCollection);
    setEditingDeck(null);
  };

  const handleDeleteDeck = (deckId: string) => {
    const newCollection = deleteDeckFromCollection(deckCollection, deckId);
    saveDeckCollection(newCollection);
    setDeckCollection(newCollection);
    setEditingDeck(null);
  };

  const handleCreateNewDeck = () => {
    if (selectedFaction) {
      const newDeck = createNewDeck(deckCollection, `新しい ${FACTION_DATA[selectedFaction].name} デッキ`, selectedFaction);
      setEditingDeck(newDeck);
    }
  };

  const handleSetActiveDeck = (deckId: string) => {
    if (selectedFaction) {
      const newCollection = setActiveDeckForFaction(deckCollection, selectedFaction, deckId);
      saveDeckCollection(newCollection);
      setDeckCollection(newCollection);
    }
  };

  const handleStart = () => {
    if (selectedFaction && selectedTactics) {
      const activeDeck = deckCollection.decks.find(d => d.id === activeDeckId);
      if (activeDeck && validateDeck(activeDeck).isValid) {
        const cardObjects = activeDeck.cards.map(id => getCardById(id)).filter((c): c is Card => c !== undefined);
        onGameStart(selectedFaction, selectedTactics, cardObjects);
      } else {
        alert('有効なカスタムデッキを選択してください。');
      }
    }
  };

  // 選択カードの共通スタイル
  const getCardStyle = (isSelected: boolean) => `
    relative cursor-pointer p-6 rounded-2xl border transition-all duration-300 group hover:scale-[1.02] backdrop-blur-sm
    ${isSelected 
      ? 'border-amber-400/60 bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-transparent shadow-2xl shadow-amber-400/25' 
      : 'border-white/15 hover:border-amber-300/40 bg-gradient-to-br from-white/8 via-white/4 to-transparent hover:shadow-2xl hover:shadow-white/10'
    }
  `;

  return (
    <NoSSR>
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
          <section>
            <h2 className="text-5xl font-bold text-center mb-12 text-amber-300 font-serif">
              勢力選択
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {Object.entries(FACTION_DATA).map(([faction, data]) => (
                <div
                  key={faction}
                  className={getCardStyle(selectedFaction === faction)}
                  onClick={() => setSelectedFaction(faction as Faction)}
                >
                  <div className="text-center">
                    <div className="mb-4 text-amber-400 flex justify-center group-hover:scale-110 transition-transform">
                      <data.icon size={48} strokeWidth={1.5} />
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-white font-serif">
                      {data.name}
                    </h3>
                    <p className="text-sm text-gray-400 font-serif leading-relaxed">
                      {data.description}
                    </p>
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

          {/* デッキ選択 */}
          {selectedFaction && (
            <section className="animate-fade-in">
              <h2 className="text-5xl font-bold text-center mb-12 text-amber-300 font-serif">
                デッキ選択
              </h2>
              <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {factionDecks.map(deck => (
                  <div key={deck.id} className={`p-4 rounded-lg border-2 transition-all ${activeDeckId === deck.id ? 'border-amber-400 bg-amber-500/10' : 'border-gray-700 bg-gray-800/50'}`}>
                    <h4 className="font-bold text-lg">{deck.name}</h4>
                    <p className="text-sm text-gray-400">{deck.cards.length} / {GAME_CONSTANTS.DECK_SIZE} 枚</p>
                    <div className="mt-4 flex space-x-2">
                      <button onClick={() => handleSetActiveDeck(deck.id)} disabled={activeDeckId === deck.id} className="flex-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded disabled:bg-gray-500 text-sm">選択</button>
                      <button onClick={() => setEditingDeck(deck)} className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded"><Edit size={16} /></button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={handleCreateNewDeck}
                  className="p-4 rounded-lg border-2 border-dashed border-gray-600 hover:border-amber-400 hover:text-amber-400 transition-all flex flex-col items-center justify-center text-gray-500"
                >
                  <PlusCircle size={32} />
                  <span className="mt-2 font-bold">新しいデッキを作成</span>
                </button>
              </div>
            </section>
          )}

          {/* 戦術選択 */}
          {selectedFaction && activeDeckId && (
            <section className="animate-fade-in">
              <h2 className="text-5xl font-bold text-center mb-12 text-amber-300 font-serif">
                戦術選択
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Object.entries(TACTICS_DATA).map(([tactics, data]) => (
                  <div
                    key={tactics}
                    className={getCardStyle(selectedTactics === tactics)}
                    onClick={() => setSelectedTactics(tactics as TacticsType)}
                  >
                    <div className="text-center">
                      <div className="mb-4 text-amber-400 flex justify-center group-hover:scale-110 transition-transform">
                        <data.icon size={40} strokeWidth={1.5} />
                      </div>
                      <h3 className="text-lg font-bold mb-2 text-white font-serif">
                        {data.name}
                      </h3>
                      <p className="text-sm text-gray-400 font-serif leading-relaxed">
                        {data.description}
                      </p>
                    </div>
                    
                    {selectedTactics === tactics && (
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
          )}

          {/* ゲーム開始 */}
          {selectedFaction && selectedTactics && activeDeckId && (
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
                onClick={handleStart}
                className="relative px-20 py-5 text-2xl font-bold font-serif tracking-wide rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:via-amber-400 hover:to-amber-500 text-black shadow-2xl hover:shadow-amber-400/40 hover:scale-105 transition-all duration-300 border-2 border-amber-400/50 overflow-hidden group"
              >
                <span className="relative z-10">バトル開始</span>
                {/* シマー効果 */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              </button>
            </section>
          )}

          {/* 基本ルール */}
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
                    <div className="w-8 h-8 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-black text-sm font-bold shadow-lg">1</div>
                    <p className="text-sm font-serif">戦術でカード自動配置</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-black text-sm font-bold shadow-lg">2</div>
                    <p className="text-sm font-serif">戦闘は自動進行</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-black text-sm font-bold shadow-lg">3</div>
                    <p className="text-sm font-serif">結果を観戦して楽しむ</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
      </div>
      {editingDeck && (
        <DeckBuilder
          deck={editingDeck}
          onSave={handleSaveDeck}
          onDelete={handleDeleteDeck}
          onClose={() => setEditingDeck(null)}
        />
      )}
    </div>
    </NoSSR>
  );
}
