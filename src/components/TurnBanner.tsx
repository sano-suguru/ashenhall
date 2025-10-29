/**
 * ターン開始バナーコンポーネント
 *
 * 設計方針:
 * - ターン開始時に画面中央に表示
 * - 2秒間のアニメーション後に自動消滅
 * - 現在のターン数とプレイヤー名を表示
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Flag } from 'lucide-react';
import type { PlayerId } from '@/types/game';

interface TurnBannerProps {
  turnNumber: number;
  currentPlayer: PlayerId;
  isVisible: boolean;
  onComplete?: () => void;
}

export default function TurnBanner({
  turnNumber,
  currentPlayer,
  isVisible,
  onComplete,
}: TurnBannerProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        onComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, turnNumber, onComplete]);

  if (!show) return null;

  const playerName = currentPlayer === 'player1' ? 'あなた' : '相手';
  const bgGradient =
    currentPlayer === 'player1' ? 'from-blue-600 to-blue-800' : 'from-red-600 to-red-800';

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div
        className={`turn-banner bg-gradient-to-r ${bgGradient} rounded-2xl px-12 py-8 border-4 border-white shadow-2xl`}
      >
        <div className="flex items-center space-x-4">
          <Flag size={48} className="text-white" />
          <div className="text-center">
            <div className="text-6xl font-bold text-white mb-2">ターン {turnNumber}</div>
            <div className="text-2xl text-white opacity-90">{playerName}のターン</div>
          </div>
          <Flag size={48} className="text-white" />
        </div>
      </div>
    </div>
  );
}
