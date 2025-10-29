import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import type { Faction } from '@/types/game';
import { Calendar, Hash, Swords, Trophy } from 'lucide-react';

// 型定義
interface SimulationResult {
  faction1: Faction;
  faction2: Faction;
  wins1: number;
  wins2: number;
  draws: number;
  averageTurns: number;
}

interface ReportData {
  simulationDate: string;
  results: SimulationResult[];
}

interface OverallFactionStats {
  games: number;
  wins: number;
}

const FACTION_NAMES: Record<Faction, string> = {
  necromancer: '死霊術師',
  berserker: '戦狂い',
  mage: '魔導士',
  knight: '騎士',
  inquisitor: '審問官',
};

// 勝率バーコンポーネント
const WinRateBar = ({ winRate }: { winRate: number }) => {
  return (
    <div className="flex items-center" title={`${winRate.toFixed(1)}%`}>
      <div className="font-mono text-sm w-12 text-right mr-2">{winRate.toFixed(1)}%</div>
      <div className="w-24 h-4 bg-gray-700 rounded-full flex overflow-hidden">
        <div className="bg-blue-500 h-full" style={{ width: `${winRate}%` }}></div>
      </div>
    </div>
  );
};

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ filename: string }>;
}) {
  const { filename } = await params;
  const reportPath = path.resolve(process.cwd(), 'simulation_reports', filename);

  let reportData: ReportData;
  try {
    const fileContents = fs.readFileSync(reportPath, 'utf8');
    reportData = JSON.parse(fileContents);
  } catch {
    return notFound();
  }

  const totalGames = reportData.results.reduce(
    (acc, result) => acc + result.wins1 + result.wins2 + result.draws,
    0
  );

  // 勢力ごとの総合勝率を計算
  const overallStats: Record<Faction, OverallFactionStats> = {
    necromancer: { games: 0, wins: 0 },
    berserker: { games: 0, wins: 0 },
    mage: { games: 0, wins: 0 },
    knight: { games: 0, wins: 0 },
    inquisitor: { games: 0, wins: 0 },
  };

  reportData.results.forEach((result) => {
    const totalMatchupGames = result.wins1 + result.wins2 + result.draws;
    overallStats[result.faction1].games += totalMatchupGames;
    overallStats[result.faction1].wins += result.wins1;
    overallStats[result.faction2].games += totalMatchupGames;
    overallStats[result.faction2].wins += result.wins2;
  });

  const sortedFactionStats = Object.entries(overallStats)
    .map(([faction, stats]) => ({
      faction: faction as Faction,
      ...stats,
      winRate: stats.games > 0 ? (stats.wins / stats.games) * 100 : 0,
    }))
    .sort((a, b) => b.winRate - a.winRate);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-900 to-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-amber-300 font-serif">
            シミュレーションレポート詳細
          </h1>
          <p className="text-gray-400 mt-2 font-mono">{filename}</p>
        </header>

        {/* サマリー */}
        <section className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 flex items-center space-x-4">
            <Calendar className="text-blue-400" size={32} />
            <div>
              <div className="text-sm text-gray-400">実行日時</div>
              <div className="text-lg font-bold">
                {new Date(reportData.simulationDate).toLocaleString('ja-JP')}
              </div>
            </div>
          </div>
          <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 flex items-center space-x-4">
            <Hash className="text-green-400" size={32} />
            <div>
              <div className="text-sm text-gray-400">総対戦数</div>
              <div className="text-lg font-bold">{totalGames} 回</div>
            </div>
          </div>
        </section>

        {/* 総合勝率ランキング */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
            <Trophy size={28} className="mr-3 text-yellow-400" />
            勢力別 総合勝率ランキング
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {sortedFactionStats.map(({ faction, winRate, wins, games }) => (
              <div
                key={faction}
                className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 text-center"
              >
                <h3 className="font-bold text-lg">{FACTION_NAMES[faction]}</h3>
                <div
                  className="text-3xl font-bold my-2"
                  style={{ color: winRate >= 50 ? '#4ade80' : '#f87171' }}
                >
                  {winRate.toFixed(2)}%
                </div>
                <div className="text-xs text-gray-400">
                  {wins}勝 / {games}戦
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 詳細結果テーブル */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
            <Swords size={28} className="mr-3 text-red-400" />
            対戦組み合わせ別 詳細
          </h2>
          <div className="overflow-x-auto bg-gray-800/50 rounded-lg border border-gray-700">
            <table className="w-full text-left">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="p-4 font-semibold">対戦組み合わせ</th>
                  <th className="p-4 font-semibold text-center">勝率</th>
                  <th className="p-4 font-semibold text-center">平均ターン数</th>
                </tr>
              </thead>
              <tbody>
                {reportData.results.map((result, index) => {
                  const totalGamesInMatchup = result.wins1 + result.wins2 + result.draws;
                  const winRate1 =
                    totalGamesInMatchup > 0 ? (result.wins1 / totalGamesInMatchup) * 100 : 0;
                  const winRate2 =
                    totalGamesInMatchup > 0 ? (result.wins2 / totalGamesInMatchup) * 100 : 0;
                  return (
                    <tr key={index} className="border-t border-gray-700">
                      <td className="p-4 font-bold">
                        {FACTION_NAMES[result.faction1]} vs {FACTION_NAMES[result.faction2]}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{FACTION_NAMES[result.faction1]}</span>
                          <WinRateBar winRate={winRate1} />
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm">{FACTION_NAMES[result.faction2]}</span>
                          <WinRateBar winRate={winRate2} />
                        </div>
                      </td>
                      <td className="p-4 text-center font-mono text-lg">
                        {result.averageTurns.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
