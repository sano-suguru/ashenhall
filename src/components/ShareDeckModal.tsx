'use client';

import { useState, useCallback } from 'react';
import type { CustomDeck } from '@/types/game';
import { encodeDeck } from '@/lib/deck-sharing';
import { toPng } from 'html-to-image';
import { createRoot } from 'react-dom/client';
import toast from 'react-hot-toast';
import Modal from './Modal';
import DeckImageGenerator from './DeckImageGenerator';
import { X, Copy, Link, Image as ImageIcon, Loader2 } from 'lucide-react';

interface ShareDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  deck: CustomDeck;
}

export default function ShareDeckModal({ isOpen, onClose, deck }: ShareDeckModalProps) {
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast.success(`${type}をクリップボードにコピーしました。`);
      })
      .catch(() => {
        toast.error('コピーに失敗しました。');
      });
  };

  const handleCopyUrl = () => {
    const deckCode = encodeDeck(deck);
    const url = `${window.location.origin}?deck=${deckCode}`;
    copyToClipboard(url, 'URL');
  };

  const handleCopyCode = () => {
    const deckCode = encodeDeck(deck);
    copyToClipboard(deckCode, 'デッキコード');
  };

  const handleDownloadImage = useCallback(async () => {
    setIsGeneratingImage(true);
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    document.body.appendChild(tempContainer);

    const root = createRoot(tempContainer);

    try {
      await new Promise<void>((resolve) => {
        root.render(<DeckImageGenerator deck={deck} />);
        setTimeout(resolve, 500);
      });

      const dataUrl = await toPng(tempContainer.firstChild as HTMLElement, {
        cacheBust: true,
        pixelRatio: 2,
      });

      const link = document.createElement('a');
      link.download = `${deck.name}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('画像をダウンロードしました。');
    } catch (err) {
      console.error('Image generation failed:', err);
      toast.error('画像の生成に失敗しました。');
    } finally {
      root.unmount();
      document.body.removeChild(tempContainer);
      setIsGeneratingImage(false);
    }
  }, [deck]);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">デッキを共有</h3>
        <button onClick={onClose}>
          <X />
        </button>
      </div>
      <div className="space-y-4">
        <button
          onClick={handleCopyUrl}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        >
          <Link />
          <span>URLをコピー</span>
        </button>
        <button
          onClick={handleCopyCode}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        >
          <Copy />
          <span>デッキコードをコピー</span>
        </button>
        <button
          onClick={handleDownloadImage}
          disabled={isGeneratingImage}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          {isGeneratingImage ? (
            <>
              <Loader2 className="animate-spin" />
              <span>生成中...</span>
            </>
          ) : (
            <>
              <ImageIcon />
              <span>画像として保存</span>
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
