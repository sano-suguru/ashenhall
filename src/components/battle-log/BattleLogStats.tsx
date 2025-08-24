import React from 'react';

interface BattleLogStatsProps {
  totalActions: number;
  filteredCount: number;
  currentTurn: number;
}

export default function BattleLogStats({
  totalActions,
  filteredCount,
  currentTurn,
}: BattleLogStatsProps) {
  return (
    <div className="mt-4 flex items-center space-x-6 text-sm text-gray-400">
      <span>
        総アクション: <span className="text-white font-bold">{totalActions}</span>
      </span>
      <span>
        表示中: <span className="text-white font-bold">{filteredCount}</span>
      </span>
      <span>
        現在ターン: <span className="text-white font-bold">{currentTurn}</span>
      </span>
    </div>
  );
}
