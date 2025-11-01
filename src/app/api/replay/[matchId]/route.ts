import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

type Match = Database['public']['Tables']['matches']['Row'];

/**
 * リプレイデータ取得 API
 *
 * GET /api/replay/[matchId]
 * 完了したマッチの replay_log を返します。
 */
export async function GET(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
  try {
    const { matchId } = await params;
    const supabase = await createServerSupabaseClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // マッチデータを取得（自分が参加したマッチのみ）
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .returns<Match>()
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: 'マッチが見つかりません' }, { status: 404 });
    }

    const matchData = match as Match;

    // 完了していないマッチはエラー
    if (matchData.status !== 'completed') {
      return NextResponse.json(
        { error: 'マッチがまだ完了していません', status: matchData.status },
        { status: 400 }
      );
    }

    // replay_log が null の場合
    if (!matchData.replay_log) {
      return NextResponse.json({ error: 'リプレイログが存在しません' }, { status: 404 });
    }

    return NextResponse.json({
      match: {
        id: matchData.id,
        player1_id: matchData.player1_id,
        player2_id: matchData.player2_id,
        winner_id: matchData.winner_id,
        result_reason: matchData.result_reason,
        total_turns: matchData.total_turns,
        duration_seconds: matchData.duration_seconds,
        created_at: matchData.created_at,
        completed_at: matchData.completed_at,
      },
      replay_log: matchData.replay_log,
    });
  } catch (error) {
    console.error('リプレイ取得エラー:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'サーバーエラー' },
      { status: 500 }
    );
  }
}
