import React from 'react';
import { Search } from 'lucide-react';

interface BattleLogControlsProps {
  searchTerm: string;
  filterType: string;
  filterPlayer: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFilterTypeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onFilterPlayerChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export default function BattleLogControls({
  searchTerm,
  filterType,
  filterPlayer,
  onSearchChange,
  onFilterTypeChange,
  onFilterPlayerChange,
}: BattleLogControlsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="アクション検索..."
          value={searchTerm}
          onChange={onSearchChange}
          className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none"
        />
      </div>
      
      <select
        value={filterType}
        onChange={onFilterTypeChange}
        className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-400 focus:outline-none"
      >
        <option value="all">全アクション</option>
        <option value="card_play">カード配置</option>
        <option value="card_attack">攻撃</option>
        <option value="effect_trigger">効果発動</option>
        <option value="keyword_trigger">キーワード発動</option>
        <option value="phase_change">フェーズ変更</option>
        <option value="energy_update">エネルギー更新</option>
        <option value="trigger_event">トリガーイベント</option>
        <option value="creature_destroyed">クリーチャー破壊</option>
      </select>
      
      <select
        value={filterPlayer}
        onChange={onFilterPlayerChange}
        className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-400 focus:outline-none"
      >
        <option value="all">全プレイヤー</option>
        <option value="player1">あなた</option>
        <option value="player2">相手</option>
      </select>
    </div>
  );
}
