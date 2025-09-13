'use client';

import React from 'react';
import type { GamePhase, PlayerId } from '@/types/game';
import { CreditCard, Zap, Target, Swords, Flag } from 'lucide-react';

const PHASE_DATA = {
  draw: { name: 'ドロー', icon: CreditCard, color: 'text-blue-400' },
  energy: { name: 'エネルギー', icon: Zap, color: 'text-yellow-400' },
  deploy: { name: '配置', icon: Target, color: 'text-green-400' },
  battle: { name: '戦闘', icon: Swords, color: 'text-red-400' },
  battle_attack: { name: '攻撃', icon: Swords, color: 'text-red-500' },
  end: { name: '終了', icon: Flag, color: 'text-purple-400' },
} as const;

interface GameHeaderProps {
  turnNumber: number;
  phase: GamePhase;
  currentPlayerId: PlayerId;
  isLogVisible: boolean;
  onReturnToSetup: () => void;
  onToggleLog: () => void;
}

const GameHeader: React.FC<GameHeaderProps> = ({
  turnNumber,
  phase,
  currentPlayerId,
  isLogVisible,
  onReturnToSetup,
  onToggleLog,
}) => {
  const currentPhase = PHASE_DATA[phase];
  const currentPlayerName = currentPlayerId === 'player1' ? 'あなた' : '相手';

  return (
    <div className="bg-gray-800/90 border-b border-gray-700 p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onReturnToSetup}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
          >
            ← 戻る
          </button>
          <h1 className="text-2xl font-bold">ASHENHALL</h1>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="text-center">
            <div className="text-sm text-gray-400">ターン</div>
            <div className="text-xl font-bold">{turnNumber}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-400">フェーズ</div>
            <div className={`flex items-center space-x-2 ${currentPhase.color}`}>
              <currentPhase.icon size={18} />
              <span className="font-bold">{currentPhase.name}</span>
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-400">手番</div>
            <div className="font-bold">{currentPlayerName}</div>
          </div>
        </div>

        <button
          onClick={onToggleLog}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
        >
          ログ {isLogVisible ? '非表示' : '表示'}
        </button>
      </div>
    </div>
  );
};

export default GameHeader;
