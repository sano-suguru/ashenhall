'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Faction } from '@/types/game';

/**
 * マッチメイキング用 Server Actions
 *
 * キュー登録・対戦相手検索・マッチ申請を処理します。
 */

interface QueueEntry {
  id: string;
  user_id: string;
  deck_id: string;
  status: 'waiting' | 'matched' | 'cancelled';
  created_at: string;
  updated_at: string;
}

interface QueueEntryWithDetails extends QueueEntry {
  deck: {
    name: string;
    faction: Faction;
    cards: string[];
    core_card_ids: string[];
  };
  profile: {
    username: string;
    display_name: string | null;
  };
}

/**
 * Supabaseサーバークライアントを作成
 */
async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component内で呼ばれた場合は無視
          }
        },
      },
    }
  );
}

/**
 * マッチングキューに登録
 */
export async function joinMatchQueue(deckId: string): Promise<{
  success: boolean;
  queueId?: string;
  error?: string;
}> {
  try {
    const supabase = await createServerSupabaseClient();

    // ユーザー認証確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    // 既存のwaitingエントリーをキャンセル
    await supabase
      .from('match_queue')
      .update({ status: 'cancelled' })
      .eq('user_id', user.id)
      .eq('status', 'waiting');

    // 新しいキューエントリーを作成
    const { data, error } = await supabase
      .from('match_queue')
      .insert({
        user_id: user.id,
        deck_id: deckId,
        status: 'waiting',
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, queueId: data.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'キュー登録に失敗しました',
    };
  }
}

/**
 * マッチングキューから退出
 */
export async function leaveMatchQueue(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createServerSupabaseClient();

    // ユーザー認証確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    // waitingステータスのエントリーをキャンセル
    const { error } = await supabase
      .from('match_queue')
      .update({ status: 'cancelled' })
      .eq('user_id', user.id)
      .eq('status', 'waiting');

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'キュー退出に失敗しました',
    };
  }
}

/**
 * 対戦可能なプレイヤーを検索
 */
export async function searchOpponents(): Promise<{
  success: boolean;
  opponents?: QueueEntryWithDetails[];
  error?: string;
}> {
  try {
    const supabase = await createServerSupabaseClient();

    // ユーザー認証確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    // waiting状態の他のプレイヤーを検索（自分以外）
    const { data, error } = await supabase
      .from('match_queue')
      .select(
        `
        *,
        deck:decks(name, faction, cards, core_card_ids),
        profile:profiles(username, display_name)
      `
      )
      .eq('status', 'waiting')
      .neq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(20);

    if (error) {
      return { success: false, error: error.message };
    }

    // 型安全な変換
    const opponents: QueueEntryWithDetails[] = (data || [])
      .filter((entry): entry is QueueEntryWithDetails => {
        return (
          entry.deck !== null &&
          entry.profile !== null &&
          typeof entry.deck === 'object' &&
          typeof entry.profile === 'object' &&
          'name' in entry.deck &&
          'faction' in entry.deck &&
          'username' in entry.profile
        );
      })
      .map((entry) => ({
        id: entry.id,
        user_id: entry.user_id,
        deck_id: entry.deck_id,
        status: entry.status,
        created_at: entry.created_at,
        updated_at: entry.updated_at,
        deck: entry.deck as {
          name: string;
          faction: Faction;
          cards: string[];
          core_card_ids: string[];
        },
        profile: entry.profile as {
          username: string;
          display_name: string | null;
        },
      }));

    return { success: true, opponents };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '対戦相手の検索に失敗しました',
    };
  }
}

/**
 * 対戦を申請（マッチ作成）
 */
export async function createMatch(
  opponentUserId: string,
  myDeckId: string,
  opponentDeckId: string
): Promise<{
  success: boolean;
  matchId?: string;
  error?: string;
}> {
  try {
    const supabase = await createServerSupabaseClient();

    // ユーザー認証確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    // マッチを作成（replay_logは空のオブジェクトで初期化）
    const { data, error } = await supabase
      .from('matches')
      .insert({
        player1_id: user.id,
        player2_id: opponentUserId,
        player1_deck_id: myDeckId,
        player2_deck_id: opponentDeckId,
        replay_log: {},
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // 両方のキューエントリーをmatchedに更新
    await Promise.all([
      supabase
        .from('match_queue')
        .update({ status: 'matched' })
        .eq('user_id', user.id)
        .eq('status', 'waiting'),
      supabase
        .from('match_queue')
        .update({ status: 'matched' })
        .eq('user_id', opponentUserId)
        .eq('status', 'waiting'),
    ]);

    return { success: true, matchId: data.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'マッチ作成に失敗しました',
    };
  }
}

/**
 * 自分の進行中のマッチを取得
 */
export async function getMyMatches(): Promise<{
  success: boolean;
  matches?: Array<{
    id: string;
    opponent_id: string;
    opponent_name: string;
    status: 'pending' | 'completed' | 'error';
    created_at: string;
  }>;
  error?: string;
}> {
  try {
    const supabase = await createServerSupabaseClient();

    // ユーザー認証確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    // 自分が関わるマッチを取得
    const { data, error } = await supabase
      .from('matches')
      .select(
        `
        id,
        player1_id,
        player2_id,
        status,
        created_at,
        player1_profile:profiles!matches_player1_id_fkey(username, display_name),
        player2_profile:profiles!matches_player2_id_fkey(username, display_name)
      `
      )
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return { success: false, error: error.message };
    }

    const matches = (data || []).map((match) => {
      const isPlayer1 = match.player1_id === user.id;
      const opponentProfile = isPlayer1 ? match.player2_profile : match.player1_profile;

      return {
        id: match.id,
        opponent_id: isPlayer1 ? match.player2_id : match.player1_id,
        opponent_name:
          (opponentProfile as { display_name?: string; username?: string })?.display_name ||
          (opponentProfile as { display_name?: string; username?: string })?.username ||
          '不明',
        status: match.status,
        created_at: match.created_at,
      };
    });

    return { success: true, matches };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'マッチ取得に失敗しました',
    };
  }
}
