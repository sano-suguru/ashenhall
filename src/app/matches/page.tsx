'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

type Match = {
  id: string;
  player1_id: string;
  player2_id: string;
  winner_id: string | null;
  result_reason: string | null;
  total_turns: number | null;
  status: 'pending' | 'completed' | 'error';
  created_at: string;
  completed_at: string | null;
};

/**
 * マッチ一覧画面
 *
 * 自分が参加したマッチの一覧を表示し、リプレイへのリンクを提供します。
 */
export default function MatchesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 認証チェック
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  // マッチ一覧取得
  useEffect(() => {
    if (!user) return;

    const fetchMatches = async () => {
      try {
        const { createBrowserClient } = await import('@supabase/ssr');
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data, error: fetchError } = await supabase
          .from('matches')
          .select('*')
          .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(20);

        if (fetchError) throw fetchError;
        setMatches((data || []) as Match[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラー');
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="mb-4 text-2xl">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="mb-4 text-2xl text-red-500">エラー</div>
          <div className="text-gray-400">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* ヘッダー */}
      <div className="border-b border-gray-700 bg-gray-800 p-4">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">マッチ履歴</h1>
          <button
            onClick={() => router.push('/')}
            className="rounded bg-gray-700 px-4 py-2 hover:bg-gray-600"
          >
            ホームに戻る
          </button>
        </div>
      </div>

      {/* マッチ一覧 */}
      <div className="container mx-auto py-8">
        {matches.length === 0 ? (
          <div className="rounded-lg bg-gray-800 p-8 text-center">
            <div className="mb-4 text-xl text-gray-400">マッチ履歴がありません</div>
            <button
              onClick={() => router.push('/')}
              className="rounded bg-blue-600 px-6 py-2 hover:bg-blue-700"
            >
              ゲームを開始
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <MatchCard key={match.id} match={match} userId={user?.id || ''} router={router} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// マッチカードコンポーネント（複雑度削減のため分離）
/* eslint-disable complexity */
function MatchCard({
  match,
  userId,
  router,
}: {
  match: Match;
  userId: string;
  router: ReturnType<typeof useRouter>;
}) {
  const isWinner = match.winner_id === userId;
  const isPlayer1 = match.player1_id === userId;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 hover:border-gray-600">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="mb-2 flex items-center space-x-3">
            {/* ステータスバッジ */}
            {match.status === 'completed' && (
              <span className="rounded bg-green-900 px-2 py-1 text-xs text-green-300">完了</span>
            )}
            {match.status === 'pending' && (
              <span className="rounded bg-yellow-900 px-2 py-1 text-xs text-yellow-300">
                保留中
              </span>
            )}
            {match.status === 'error' && (
              <span className="rounded bg-red-900 px-2 py-1 text-xs text-red-300">エラー</span>
            )}

            {/* 勝敗表示 */}
            {match.status === 'completed' && (
              <>
                {isWinner && <span className="font-bold text-green-500">🏆 勝利</span>}
                {!isWinner && match.winner_id && (
                  <span className="font-bold text-red-500">敗北</span>
                )}
                {!match.winner_id && <span className="font-bold text-gray-400">引き分け</span>}
              </>
            )}
          </div>

          <div className="text-sm text-gray-400">
            {new Date(match.created_at).toLocaleString('ja-JP')}
            {match.total_turns && ` • ${match.total_turns} ターン`}
          </div>

          <div className="mt-1 text-xs text-gray-500">
            {isPlayer1 ? 'あなた vs 相手' : '相手 vs あなた'}
          </div>
        </div>

        {/* アクションボタン */}
        <div>
          {match.status === 'completed' ? (
            <button
              onClick={() => router.push(`/replay/${match.id}`)}
              className="rounded bg-blue-600 px-4 py-2 hover:bg-blue-700"
            >
              リプレイを見る
            </button>
          ) : match.status === 'pending' ? (
            <div className="text-sm text-gray-400">処理待ち...</div>
          ) : (
            <div className="text-sm text-red-400">エラー</div>
          )}
        </div>
      </div>
    </div>
  );
}
