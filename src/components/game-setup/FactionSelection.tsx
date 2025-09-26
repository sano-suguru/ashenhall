/**
 * 勢力選択コンポーネント
 * GameSetupから勢力選択UI部分を抽出
 */

'use client';

import { FACTION_DATA, getSelectionCardStyle } from '../GameSetup';
import type { Faction } from '@/types/game';

interface FactionSelectionProps {
  selectedFaction: Faction | null;
  onFactionSelect: (faction: Faction) => void;
}

export default function FactionSelection({ 
  selectedFaction, 
  onFactionSelect 
}: FactionSelectionProps) {
  return (
    <section>
      <h2 className="text-5xl font-bold text-center mb-12 text-amber-300 font-serif">
        勢力選択
      </h2>
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
  );
}
