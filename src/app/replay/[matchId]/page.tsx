'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

/**
 * リプレイビューアー（シンプル版）
 *
 * 完了したマッチの情報を表示します。
 * TODO: ゲーム状態の復元と再生機能を実装
 */
export default function ReplayPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replayData, setReplayData] = useState<{
    match: {
      id: string;
      player1_id: string;
      player2_id: string;
      winner_id: string | null;
      result_reason: string | null;
      total_turns: number | null;
      duration_seconds: number | null;
      created_at: string;
      completed_at: string | null;
    };
    replay_log: {
      matchId: string;
      player1: { id: string; faction: string; deck: string[] };
      player2: { id: string; faction: string; deck: string[] };
      actions: unknown[];
      finalState: {
        winner: string | null;
        totalTurns: number;
        player1HP: number;
        player2HP: number;
      };
    };
  } | null>(null);

  // リプレイデータ取得
  useEffect(() => {
    const fetchReplay = async () => {
      try {
        const response = await fetch(`/api/replay/${matchId}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'リプレイデータの取得に失敗しました');
        }
        const data = await response.json();
        setReplayData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラー');
      } finally {
        setLoading(false);
      }
    };

    fetchReplay();
  }, [matchId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="mb-4 text-2xl">読み込み中...</div>
          <div className="text-gray-400">リプレイデータを取得しています</div>
        </div>
      </div>
    );
  }

  if (error || !replayData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="mb-4 text-2xl text-red-500">エラー</div>
          <div className="mb-8 text-gray-400">{error || '不明なエラーが発生しました'}</div>
          <button
            onClick={() => router.push('/matches')}
            className="rounded bg-blue-600 px-6 py-2 hover:bg-blue-700"
          >
            マッチ一覧に戻る
          </button>
        </div>
      </div>
    );
  }

  const { match, replay_log } = replayData;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* ヘッダー */}
      <div className="border-b border-gray-700 bg-gray-800 p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">リプレイビューアー</h1>
            <div className="mt-1 text-sm text-gray-400">Match ID: {matchId.substring(0, 8)}...</div>
          </div>
          <button
            onClick={() => router.push('/matches')}
            className="rounded bg-gray-700 px-4 py-2 hover:bg-gray-600"
          >
            マッチ一覧に戻る
          </button>
        </div>
      </div>

      {/* マッチ情報 */}
      <div className="container mx-auto py-8">
        <div className="rounded-lg bg-gray-800 p-6">
          <h2 className="mb-4 text-xl font-bold">対戦結果</h2>

          <div className="grid grid-cols-2 gap-8">
            {/* Player 1 */}
            <div className="rounded border border-gray-700 p-4">
              <div className="mb-2 text-sm text-gray-400">Player 1</div>
              <div className="mb-2 text-lg font-bold capitalize">{replay_log.player1.faction}</div>
              <div className="text-sm text-gray-400">
                最終 HP: {replay_log.finalState.player1HP}
              </div>
              {match.winner_id === match.player1_id && (
                <div className="mt-2 font-bold text-green-500">🏆 勝利</div>
              )}
            </div>

            {/* Player 2 */}
            <div className="rounded border border-gray-700 p-4">
              <div className="mb-2 text-sm text-gray-400">Player 2</div>
              <div className="mb-2 text-lg font-bold capitalize">{replay_log.player2.faction}</div>
              <div className="text-sm text-gray-400">
                最終 HP: {replay_log.finalState.player2HP}
              </div>
              {match.winner_id === match.player2_id && (
                <div className="mt-2 font-bold text-green-500">🏆 勝利</div>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-gray-700 pt-4">
            <div>
              <div className="text-sm text-gray-400">結果</div>
              <div className="mt-1 font-bold">{match.winner_id ? '勝敗あり' : '引き分け'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">ターン数</div>
              <div className="mt-1 font-bold">{replay_log.finalState.totalTurns}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">所要時間</div>
              <div className="mt-1 font-bold">{match.duration_seconds || 0} 秒</div>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-700 pt-4">
            <div className="text-sm text-gray-400">アクション数</div>
            <div className="mt-1 font-bold">{replay_log.actions.length} 個</div>
          </div>

          {/* TODO: リプレイ再生機能 */}
          <div className="mt-8 rounded border border-yellow-700 bg-yellow-900/20 p-4 text-center">
            <div className="text-yellow-500">🚧 リプレイ再生機能は実装予定です</div>
            <div className="mt-2 text-sm text-gray-400">現在はマッチ結果の閲覧のみ可能です</div>
          </div>
        </div>
      </div>
    </div>
  );
}
