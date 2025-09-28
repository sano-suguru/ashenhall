/**
 * デッキビルダーUIコンポーネント
 * 
 * 設計方針:
 * - ドラッグ＆ドロップ非対応のシンプルなUIでMVPを迅速に実装
 * - カード一覧とデッキ内容を明確に分離して表示
 * - デッキの妥当性（枚数、同名カード制限）をリアルタイムでフィードバック
 * - 統合デッキ共有機能（URL/コード/画像）
 */

import { useState, useMemo, useRef } from 'react';
import type { CustomDeck, Card } from '@/types/game';
import { getCardsByFaction } from '@/data/cards/base-cards';
import { validateDeck } from '@/lib/deck-utils';
import { GAME_CONSTANTS } from '@/types/game';
import CardComponent from './CardComponent';
import ShareDeckModal from './ShareDeckModal';
import { Save, Trash2, AlertCircle, CheckCircle, Star, Share2 } from 'lucide-react';

interface DeckBuilderProps {
  deck: CustomDeck;
  onSave: (deck: CustomDeck) => void;
  onDelete: (deckId: string) => void;
  onClose: () => void;
}

export default function DeckBuilder({ deck, onSave, onDelete, onClose }: DeckBuilderProps) {
  const [currentDeck, setCurrentDeck] = useState<CustomDeck>({
    ...deck,
    coreCardIds: deck.coreCardIds || [],
  });
  const [showShareModal, setShowShareModal] = useState(false);
  const deckContentRef = useRef<HTMLDivElement>(null);

  const availableCards = useMemo(() => getCardsByFaction(deck.faction), [deck.faction]);

  const deckValidation = useMemo(() => validateDeck(currentDeck), [currentDeck]);

  const handleDeckNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentDeck({ ...currentDeck, name: e.target.value });
  };

  const addCardToDeck = (card: Card) => {
    const cardCount = currentDeck.cards.filter(id => id === card.templateId).length;
    const isCore = currentDeck.coreCardIds.includes(card.templateId);
    const limit = isCore ? 3 : GAME_CONSTANTS.CARD_COPY_LIMIT;

    if (cardCount < limit && currentDeck.cards.length < GAME_CONSTANTS.DECK_SIZE) {
      setCurrentDeck({ ...currentDeck, cards: [...currentDeck.cards, card.templateId] });
    }
  };

  const removeCardFromDeck = (cardId: string) => {
    const cardIndex = currentDeck.cards.lastIndexOf(cardId);
    if (cardIndex > -1) {
      const newCards = [...currentDeck.cards];
      newCards.splice(cardIndex, 1);
      setCurrentDeck({ ...currentDeck, cards: newCards });
    }
  };

  const toggleCoreCard = (cardId: string) => {
    const isCore = currentDeck.coreCardIds.includes(cardId);
    if (isCore) {
      setCurrentDeck({
        ...currentDeck,
        coreCardIds: currentDeck.coreCardIds.filter(id => id !== cardId),
      });
    } else {
      if (currentDeck.coreCardIds.length < 3) {
        setCurrentDeck({
          ...currentDeck,
          coreCardIds: [...currentDeck.coreCardIds, cardId],
        });
      }
    }
  };

  const handleSave = () => {
    if (deckValidation.isValid) {
      onSave(currentDeck);
    }
  };

  const handleDelete = () => {
    if (window.confirm(`本当にデッキ「${deck.name}」を削除しますか？`)) {
      onDelete(deck.id);
    }
  };

  const getCardCountInDeck = (cardId: string) => {
    return currentDeck.cards.filter(id => id === cardId).length;
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <header className="p-4 border-b border-gray-700 flex justify-between items-center">
          <input
            type="text"
            value={currentDeck.name}
            onChange={handleDeckNameChange}
            className="bg-transparent text-2xl font-bold text-white border-b-2 border-gray-600 focus:border-amber-400 outline-none"
          />
          <div className="flex items-center space-x-4">
            <button onClick={handleShare} className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"><Share2 /><span>共有</span></button>
            <button onClick={handleDelete} className="text-red-500 hover:text-red-400 transition-colors"><Trash2 /></button>
            <button onClick={handleSave} disabled={!deckValidation.isValid} className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"><Save /><span>保存</span></button>
            <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors">閉じる</button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-grow flex overflow-hidden">
          {/* Available Cards */}
          <aside className="w-1/3 p-4 overflow-y-auto border-r border-gray-700">
            <h3 className="text-xl font-bold mb-4 text-amber-300">カード一覧 ({availableCards.length}種)</h3>
            <p className="text-sm text-gray-400 mb-4">★アイコンクリックでコアカード(3枚まで)を選択</p>
            <div className="grid grid-cols-2 gap-2">
              {availableCards.map(card => {
                const isCore = currentDeck.coreCardIds.includes(card.templateId);
                return (
                  <div key={card.templateId} className="relative">
                    <div onClick={() => addCardToDeck(card)} className="cursor-pointer">
                      <CardComponent card={card} size="medium" />
                    </div>
                    <div className="absolute top-2 right-2 flex items-center space-x-1">
                      <button onClick={() => toggleCoreCard(card.templateId)} className={`p-1 rounded-full ${isCore ? 'bg-amber-400 text-gray-900' : 'bg-black/70 text-gray-400 hover:text-white'}`}>
                        <Star size={16} />
                      </button>
                      <div className="bg-black/70 rounded-full w-6 h-6 flex items-center justify-center text-lg font-bold">
                        {getCardCountInDeck(card.templateId)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Deck Content */}
          <main className="w-2/3 p-4 flex flex-col" ref={deckContentRef}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-amber-300">デッキ内容 ({currentDeck.cards.length}/{GAME_CONSTANTS.DECK_SIZE})</h3>
              <div className="text-sm text-gray-400">
                コアカード: {currentDeck.coreCardIds.length}/3
              </div>
            </div>
            <div className="flex-grow overflow-y-auto bg-gray-800/50 rounded-lg p-2">
              <div className="grid grid-cols-4 gap-2">
                {currentDeck.cards
                  .slice()
                  .sort((a, b) => {
                    const cardA = availableCards.find(c => c.templateId === a);
                    const cardB = availableCards.find(c => c.templateId === b);
                    return (cardA?.cost ?? 0) - (cardB?.cost ?? 0);
                  })
                  .map((cardId, index) => {
                    const card = availableCards.find(c => c.templateId === cardId);
                    const isCore = currentDeck.coreCardIds.includes(cardId);
                    return card ? (
                      <div key={`${cardId}-${index}`} onClick={() => removeCardFromDeck(cardId)} className="cursor-pointer relative">
                        <CardComponent card={card} size="medium" />
                        {isCore && <Star size={16} className="absolute top-2 left-2 text-amber-400" />}
                      </div>
                    ) : null;
                  })}
              </div>
            </div>
            {/* Validation Info */}
            <footer className="p-4 mt-4 border-t border-gray-700">
              {deckValidation.errors.length > 0 ? (
                <div className="text-red-400 flex items-center space-x-2">
                  <AlertCircle />
                  <div>
                    {deckValidation.errors.map((error, i) => <p key={i}>{error}</p>)}
                  </div>
                </div>
              ) : (
                <div className="text-green-400 flex items-center space-x-2">
                  <CheckCircle />
                  <p>このデッキは使用可能です。</p>
                </div>
              )}
            </footer>
          </main>
        </div>

        <ShareDeckModal 
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          deck={currentDeck}
        />
      </div>
    </div>
  );
}
