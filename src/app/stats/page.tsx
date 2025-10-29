'use client';

import React, { useState, useEffect } from 'react';
import type { LocalStats, Faction } from '@/types/game';
import { loadStats } from '@/lib/stats-utils';
import Link from 'next/link';
import { ArrowLeft, BarChart2, Trophy } from 'lucide-react';

const FACTION_NAMES: Record<Faction, string> = {
  necromancer: '死霊術師',
  berserker: '戦狂い',
  mage: '魔導士',
  knight: '騎士',
  inquisitor: '審問官',
};

export default function StatsPage() {
  const [stats, setStats] = useState<LocalStats | null>(null);

  useEffect(() => {
    setStats(loadStats());
  }, []);

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p>統計データを読み込み中...</p>
      </div>
    );
  }

  const totalWinRate = stats.totalGames > 0 ? (stats.totalWins / stats.totalGames) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-900 to-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-12">
          <h1 className="text-5xl font-bold text-amber-300 font-serif flex items-center">
            <BarChart2 className="mr-4" />
            戦績ダッシュボード
          </h1>
          <Link
            href="/"
            className="flex items-center text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ArrowLeft className="mr-2" size={20} />
            ゲームに戻る
          </Link>
        </header>

        {/* 総合戦績 */}
        <section className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 text-center">
            <h2 className="text-lg text-gray-400">総対戦数</h2>
            <p className="text-4xl font-bold mt-2">{stats.totalGames} 回</p>
          </div>
          <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 text-center">
            <h2 className="text-lg text-gray-400">総勝利数</h2>
            <p className="text-4xl font-bold mt-2">{stats.totalWins} 回</p>
          </div>
          <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 text-center">
            <h2 className="text-lg text-gray-400">総合勝率</h2>
            <p className="text-4xl font-bold mt-2">{totalWinRate.toFixed(2)}%</p>
          </div>
        </section>

        {/* 勢力別戦績 */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
            <Trophy size={28} className="mr-3 text-yellow-400" />
            勢力別 戦績
          </h2>
          <div className="space-y-4">
            {Object.entries(stats.factionStats).map(([faction, factionStats]) => {
              const winRate =
                factionStats.games > 0 ? (factionStats.wins / factionStats.games) * 100 : 0;
              return (
                <div
                  key={faction}
                  className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 flex items-center justify-between"
                >
                  <h3 className="text-xl font-bold">{FACTION_NAMES[faction as Faction]}</h3>
                  <div className="flex items-center space-x-8">
                    <div className="text-center">
                      <div className="text-sm text-gray-400">対戦数</div>
                      <div className="text-lg font-bold">{factionStats.games}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-400">勝利数</div>
                      <div className="text-lg font-bold">{factionStats.wins}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-400">勝率</div>
                      <div className="text-lg font-bold">{winRate.toFixed(2)}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
