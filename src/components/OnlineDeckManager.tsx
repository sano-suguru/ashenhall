'use client';

import { useState, useEffect } from 'react';
import { getUserDecks, deleteDeck, saveDeck } from '@/app/actions/deck-actions';
import { useAuth } from '@/hooks/useAuth';
import { X, Trash2, Download, Save, Cloud } from 'lucide-react';
import type { Faction, CustomDeck } from '@/types/game';
import toast from 'react-hot-toast';

interface OnlineDeckManagerProps {
  onClose: () => void;
  onLoadDeck: (deck: CustomDeck) => void;
  currentDeck?: CustomDeck;
}

interface DeckData {
  id: string;
  name: string;
  faction: Faction;
  cards: string[];
  core_card_ids: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * オンラインデッキ管理モーダル
 *
 * ログインユーザーのSupabaseデッキ一覧表示・読み込み・削除・保存
 */
export default function OnlineDeckManager({
  onClose,
  onLoadDeck,
  currentDeck,
}: OnlineDeckManagerProps) {
  const { user, isAuthenticated } = useAuth();
  const [decks, setDecks] = useState<DeckData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadDecks();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadDecks = async () => {
    setLoading(true);
    const result = await getUserDecks();
    if (result.success && result.decks) {
      setDecks(result.decks);
    } else {
      toast.error(result.error || 'デッキの読み込みに失敗しました');
    }
    setLoading(false);
  };

  const handleLoadDeck = (deck: DeckData) => {
    // DeckDataをCustomDeckに変換
    const customDeck: CustomDeck = {
      id: deck.id,
      name: deck.name,
      faction: deck.faction,
      cards: deck.cards,
      coreCardIds: deck.core_card_ids,
      createdAt: deck.created_at,
      updatedAt: deck.updated_at,
    };

    onLoadDeck(customDeck);
    toast.success(`${deck.name} を読み込みました`);
    onClose();
  };

  const handleDeleteDeck = async (deckId: string, deckName: string) => {
    if (!confirm(`${deckName} を削除しますか？`)) {
      return;
    }

    const result = await deleteDeck(deckId);
    if (result.success) {
      toast.success('デッキを削除しました');
      setDecks(decks.filter((d) => d.id !== deckId));
    } else {
      toast.error(result.error || '削除に失敗しました');
    }
  };

  const handleSaveCurrentDeck = async () => {
    if (!currentDeck) {
      toast.error('保存するデッキがありません');
      return;
    }

    setSaving(true);
    const result = await saveDeck({
      name: currentDeck.name,
      faction: currentDeck.faction,
      cardIds: currentDeck.cards,
      coreCardIds: currentDeck.coreCardIds,
    });

    if (result.success) {
      toast.success('デッキを保存しました');
      await loadDecks();
    } else {
      toast.error(result.error || '保存に失敗しました');
    }
    setSaving(false);
  };

  const getCardCount = (cardIds: string[]) => {
    return cardIds.length;
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-8 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
          >
            <X size={24} />
          </button>

          <div className="text-center">
            <Cloud size={64} className="mx-auto mb-4 text-blue-400" />
            <h2 className="text-2xl font-bold mb-4 text-white">オンラインデッキ管理</h2>
            <p className="text-gray-300 mb-6">
              オンラインデッキ機能を使用するにはログインが必要です。
            </p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden relative">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">オンラインデッキ管理</h2>
            <p className="text-sm text-gray-400 mt-1">{user?.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
          {currentDeck && (
            <div className="mb-6 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white mb-1">現在のデッキを保存</h3>
                  <p className="text-sm text-gray-400">
                    {currentDeck.name} ({currentDeck.cards.length}枚)
                  </p>
                </div>
                <button
                  onClick={handleSaveCurrentDeck}
                  disabled={saving}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition"
                >
                  <Save size={18} />
                  <span>{saving ? '保存中...' : '保存'}</span>
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">読み込み中...</p>
            </div>
          ) : decks.length === 0 ? (
            <div className="text-center py-12">
              <Cloud size={64} className="mx-auto mb-4 text-gray-500" />
              <p className="text-gray-400 mb-2">保存されたデッキがありません</p>
              <p className="text-sm text-gray-500">デッキを作成して保存ボタンを押してください</p>
            </div>
          ) : (
            <div className="space-y-4">
              {decks.map((deck) => (
                <div
                  key={deck.id}
                  className="p-4 bg-gray-700/50 border border-gray-600 rounded-lg hover:border-gray-500 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-white mb-1">{deck.name}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span>勢力: {deck.faction}</span>
                        <span>カード数: {getCardCount(deck.cards)}枚</span>
                        <span>コア: {deck.core_card_ids.length}枚</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        更新: {new Date(deck.updated_at).toLocaleString('ja-JP')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleLoadDeck(deck)}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                      >
                        <Download size={18} />
                        <span>読み込み</span>
                      </button>
                      <button
                        onClick={() => handleDeleteDeck(deck.id, deck.name)}
                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
