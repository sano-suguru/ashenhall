import React from 'react';

interface DestroyedCardGhostProps {
  snapshot: {
    id: string;
    owner: string;
    name: string;
    attackTotal: number;
    healthTotal: number;
    currentHealth: number;
    baseAttack: number;
    baseHealth: number;
    keywords: string[];
  };
}

// シンプルなゴースト表示（暫定デザイン）。必要に応じて CardComponent の軽量版に置換可。
const DestroyedCardGhost: React.FC<DestroyedCardGhostProps> = ({ snapshot }) => {
  return (
    <div className="pointer-events-none select-none">
      <div className="w-24 h-32 relative">
        <div className="absolute inset-0 rounded-lg border border-red-400/60 bg-red-900/30 backdrop-blur-sm animate-pulse opacity-80">
          <div className="text-xs font-bold text-center mt-1 truncate px-1">{snapshot.name}</div>
          <div className="absolute bottom-1 left-1 text-xs font-semibold text-yellow-300">{snapshot.attackTotal}</div>
          <div className="absolute bottom-1 right-1 text-xs font-semibold text-green-300">{snapshot.currentHealth}</div>
        </div>
      </div>
    </div>
  );
};

export default DestroyedCardGhost;
