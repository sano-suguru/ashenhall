import fs from 'fs/promises';
import path from 'path';
import Link from 'next/link';
import { FileText } from 'lucide-react';

interface ReportInfo {
  filename: string;
  date: string;
}

// 日付をフォーマットする関数
const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return 'Invalid Date';
  }
};

export default async function ReportsPage() {
  const reportsDirectory = path.resolve(process.cwd(), 'simulation_reports');
  let reportInfos: ReportInfo[] = [];

  try {
    const reportFiles = (await fs.readdir(reportsDirectory))
      .filter(file => file.endsWith('.json'));

    const reportsWithDates = await Promise.all(
      reportFiles.map(async (filename) => {
        try {
          const filePath = path.join(reportsDirectory, filename);
          const fileContents = await fs.readFile(filePath, 'utf8');
          const data = JSON.parse(fileContents);
          return { filename, date: data.simulationDate };
        } catch {
          return { filename, date: '' }; // 読み込み失敗
        }
      })
    );

    reportInfos = reportsWithDates
      .filter(info => info.date) // 日付が取得できたもののみ
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  } catch (error) {
    console.error("Could not read reports directory:", error);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-900 to-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-amber-300 font-serif">
            シミュレーションレポート一覧
          </h1>
          <p className="text-gray-400 mt-2">
            AI同士の自動対戦結果を確認し、ゲームバランスの分析に役立てます。
          </p>
        </header>

        {reportInfos.length > 0 ? (
          <div className="space-y-4">
            {reportInfos.map(({ filename, date }) => (
              <Link
                key={filename}
                href={`/reports/${filename}`}
                className="block p-6 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-amber-400/60 hover:bg-gray-800 transition-all duration-300"
              >
                <div className="flex items-center">
                  <FileText className="text-blue-400 mr-4" size={24} />
                  <div>
                    <div className="font-bold text-lg text-white">{formatDate(date)}</div>
                    <div className="text-sm text-gray-400 font-mono">{filename}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center bg-gray-800/50 rounded-lg p-8 border border-gray-700">
            <p className="text-gray-400">利用可能なレポートはありません。</p>
            <p className="text-sm text-gray-500 mt-2">`pnpm test src/__tests__/ai-battle-simulator.test.ts` を実行してレポートを生成してください。</p>
          </div>
        )}
      </div>
    </div>
  );
}
