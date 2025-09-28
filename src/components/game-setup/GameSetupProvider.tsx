/**
 * GameSetup用のState管理プロバイダー
 * 複雑なstate管理とuseEffectロジックを統合
 */

'use client';

import { useState, useEffect, useMemo, createContext, useContext } from 'react';
import type { Faction, TacticsType, DeckCollection, CustomDeck, Card } from '@/types/game';
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
import { getCardTemplateById, createCardFromTemplate } from '@/data/cards/card-registry';
import { generateDeckInstanceId } from '@/lib/instance-id-generator';
import { sampleDecks } from '@/data/decks/sample-decks';
import { FACTION_DATA } from '../GameSetup';

interface GameSetupContextType {
  // State
  selectedFaction: Faction | null;
  selectedTactics: TacticsType | null;
  deckCollection: DeckCollection;
  editingDeck: CustomDeck | null;
  activeDeckId?: string;
  factionDecks: CustomDeck[];
  
  // Actions
  setSelectedFaction: (faction: Faction) => void;
  setSelectedTactics: (tactics: TacticsType) => void;
  handleCreateNewDeck: () => void;
  handleSaveDeck: (deckToSave: CustomDeck) => void;
  handleDeleteDeck: (deckId: string) => void;
  handleSetActiveDeck: (deckId: string) => void;
  setEditingDeck: (deck: CustomDeck | null) => void;
  handleStart: (onGameStart: (faction: Faction, tactics: TacticsType, deck: Card[]) => void) => void;
}

const GameSetupContext = createContext<GameSetupContextType | null>(null);

export function useGameSetup() {
  const context = useContext(GameSetupContext);
  if (!context) {
    throw new Error('useGameSetup must be used within a GameSetupProvider');
  }
  return context;
}

interface GameSetupProviderProps {
  children: React.ReactNode;
}

export function GameSetupProvider({ children }: GameSetupProviderProps) {
  const [selectedFaction, setSelectedFaction] = useState<Faction | null>(null);
  const [selectedTactics, setSelectedTactics] = useState<TacticsType | null>(null);
  const [deckCollection, setDeckCollection] = useState<DeckCollection>({ decks: [], activeDeckIds: {} });
  const [editingDeck, setEditingDeck] = useState<CustomDeck | null>(null);

  // 初期化処理
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
    // サンプルデッキが無い場合は初期化
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

  // 計算プロパティ
  const factionDecks = useMemo(() => {
    if (!selectedFaction) return [];
    return deckCollection.decks.filter(d => d.faction === selectedFaction);
  }, [deckCollection.decks, selectedFaction]);

  const activeDeckId = selectedFaction ? deckCollection.activeDeckIds[selectedFaction] : undefined;

  // Actions
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

  /**
   * デッキのカードIDからCardオブジェクト配列を生成（決定論的instanceId付与）
   * バトル開始時に各カードに一意のinstanceIdを付与
   */
  const createUniqueCardDeck = (cardIds: string[]): Card[] => {
    const cardObjects: Card[] = [];
    const cardCountMap = new Map<string, number>();
    
    for (let index = 0; index < cardIds.length; index++) {
      const cardId = cardIds[index];
      const template = getCardTemplateById(cardId);
      if (template) {
        // 同一カードの通し番号を管理
        const currentCount = cardCountMap.get(cardId) || 0;
        cardCountMap.set(cardId, currentCount + 1);
        
        // 決定論的instanceId生成: templateId-deck-position-cardCount
        const instanceId = generateDeckInstanceId(
          template.templateId,
          index,
          currentCount
        );
        
        const cardInstance = createCardFromTemplate(template, instanceId);
        cardObjects.push(cardInstance);
      }
    }
    
    return cardObjects;
  };

  const handleStart = (onGameStart: (faction: Faction, tactics: TacticsType, deck: Card[]) => void) => {
    if (selectedFaction && selectedTactics) {
      const activeDeck = deckCollection.decks.find(d => d.id === activeDeckId);
      if (activeDeck && validateDeck(activeDeck).isValid) {
        // 一意ID付与システムを使用
        const cardObjects = createUniqueCardDeck(activeDeck.cards);
        onGameStart(selectedFaction, selectedTactics, cardObjects);
      } else {
        alert('有効なカスタムデッキを選択してください。');
      }
    }
  };

  const contextValue: GameSetupContextType = {
    // State
    selectedFaction,
    selectedTactics,
    deckCollection,
    editingDeck,
    activeDeckId,
    factionDecks,
    
    // Actions
    setSelectedFaction,
    setSelectedTactics,
    handleCreateNewDeck,
    handleSaveDeck,
    handleDeleteDeck,
    handleSetActiveDeck,
    setEditingDeck,
    handleStart,
  };

  return (
    <GameSetupContext.Provider value={contextValue}>
      {children}
    </GameSetupContext.Provider>
  );
}
