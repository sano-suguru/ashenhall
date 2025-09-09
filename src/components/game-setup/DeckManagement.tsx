/**
 * デッキ管理コンポーネント
 * GameSetupからデッキ管理UI部分を抽出
 */

'use client';

import { useMemo } from 'react';
import type { Faction, DeckCollection, CustomDeck } from '@/types/game';
import { GAME_CONSTANTS } from '@/types/game';
import { validateDeck } from '@/lib/deck-utils';
import { FACTION_DATA } from './GameSetupConstants';
import { PlusCircle, Edit } from 'lucide-react';

interface DeckManagementProps {
  selectedFaction: Faction | null;
  deckCollection: DeckCollection;
  activeDeckId?: string;
  onCreateNewDeck: () => void;
  onEditDeck: (deck: CustomDeck) => void;
  onSetActiveDeck: (deckId: string) => void;
}

export default function DeckManagement({ 
  selectedFaction,
  deckCollection,
  activeDeckId,
  onCreateNewDeck,
  onEditDeck,
  onSetActiveDeck
}: DeckManagementProps) {
  const factionDecks = useMemo(() => {
    if (!selectedFaction) return [];
    return deckCollection.decks.filter(d => d.faction === selectedFaction);
  }, [deckCollection.decks, selectedFaction]);

  if (!selectedFaction) {
    return null;
  }

  return (
    <section className="animate-fade-in">
      <h2 className="text-5xl font-bold text-center mb-12 text-amber-300 font-serif">
        デッキ選択
      </h2>
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {factionDecks.map(deck => {
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
                <p className="text-xs text-red-400 mt-1">
                  {validation.errors[0]}
                </p>
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
    </section>
  );
}
