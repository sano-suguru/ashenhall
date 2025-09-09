/**
 * 戦術選択コンポーネント
 * GameSetupから戦術選択UI部分を抽出
 */

'use client';

import { TACTICS_DATA, getSelectionCardStyle } from './GameSetupConstants';
import type { TacticsType } from '@/types/game';

interface TacticsSelectionProps {
  selectedTactics: TacticsType | null;
  onTacticsSelect: (tactics: TacticsType) => void;
}

export default function TacticsSelection({ 
  selectedTactics, 
  onTacticsSelect 
}: TacticsSelectionProps) {
  return (
    <section className="animate-fade-in">
      <h2 className="text-5xl font-bold text-center mb-12 text-amber-300 font-serif">
        戦術選択
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(TACTICS_DATA).map(([tactics, data]) => (
          <div
            key={tactics}
            className={getSelectionCardStyle(selectedTactics === tactics)}
            onClick={() => onTacticsSelect(tactics as TacticsType)}
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
  );
}
