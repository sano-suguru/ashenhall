/**
 * ローカル戦績表示コンポーネント
 * 
 * 設計方針:
 * - LocalStatsオブジェクトを受け取り、総合戦績と勢力別戦績を表示
 * - 勝率は小数点以下1桁まで表示
 * - 対戦数0の場合は'--'を表示し、ゼロ除算を回避
 * - lucide-reactアイコンで見出しを装飾
 */
'use client';

import type { LocalStats, Faction } from '@/types/game';
import { Swords, Trophy, BarChart3 } from 'lucide-react';

interface GameStatsDisplayProps {
  stats: LocalStats | null;
}

const FACTION_NAMES: Record<Faction, string> = {
  necromancer: '死霊術師',
  berserker: '戦狂い',
  mage: '魔導士',
  knight: '騎士',
  inquisitor: '審問官',
};

// 勝率を計算してフォーマットするヘルパー関数
const calculateWinRate = (wins: number, games: number): string => {
  if (games === 0) return '--';
  return ((wins / games) * 100).toFixed(1) + '%';
};

export default function GameStatsDisplay({ stats }: GameStatsDisplayProps) {
  if (!stats || stats.totalGames === 0) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-6 text-center border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-2">戦績データ</h2>
        <p className="text-gray-400">まだ対戦記録がありません。最初の戦いに挑みましょう！</p>
      </div>
    );
  }

  const totalWinRate = calculateWinRate(stats.totalWins, stats.totalGames);

  return (
    <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
      <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
        <BarChart3 size={24} className="mr-2 text-blue-400" />
        あなたの戦績
      </h2>

      {/* 総合戦績 */}
      <div className="grid grid-cols-3 gap-4 text-center mb-6 bg-gray-900/50 p-4 rounded-lg">
        <div>
          <div className="text-sm text-gray-400">総対戦数</div>
          <div className="text-2xl font-bold flex items-center justify-center space-x-2">
            <Swords size={20} />
            <span>{stats.totalGames}</span>
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-400">勝利数</div>
          <div className="text-2xl font-bold flex items-center justify-center space-x-2">
            <Trophy size={20} className="text-yellow-400" />
            <span>{stats.totalWins}</span>
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-400">勝率</div>
          <div className="text-2xl font-bold text-green-400">{totalWinRate}</div>
        </div>
      </div>

      {/* 勢力別戦績 */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">勢力別データ</h3>
        <div className="space-y-2">
          {Object.entries(stats.factionStats).map(([faction, factionStats]) => {
            const winRate = calculateWinRate(factionStats.wins, factionStats.games);
            return (
              <div key={faction} className="grid grid-cols-4 items-center bg-gray-800 p-2 rounded-md text-sm">
                <div className="font-bold col-span-1">{FACTION_NAMES[faction as Faction]}</div>
                <div className="text-center text-gray-300">
                  <span className="text-xs text-gray-500 mr-1">対戦:</span> {factionStats.games}
                </div>
                <div className="text-center text-green-400">
                  <span className="text-xs text-gray-500 mr-1">勝利:</span> {factionStats.wins}
                </div>
                <div className="text-center font-mono text-blue-300">
                  <span className="text-xs text-gray-500 mr-1">勝率:</span> {winRate}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
