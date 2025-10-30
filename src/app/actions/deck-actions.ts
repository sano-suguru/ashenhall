'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Faction } from '@/types/game';

/**
 * デッキ保存・読み込み用 Server Actions
 *
 * ログインユーザーのデッキをSupabaseに保存・取得します。
 */

interface SaveDeckParams {
  name: string;
  faction: Faction;
  cardIds: string[];
  coreCardIds: string[];
}

interface DeckData {
  id: string;
  name: string;
  faction: Faction;
  cards: string[];
  core_card_ids: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
 * デッキを保存
 */
export async function saveDeck(params: SaveDeckParams): Promise<{
  success: boolean;
  deckId?: string;
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

    // デッキ保存
    const { data, error } = await supabase
      .from('decks')
      .insert({
        user_id: user.id,
        name: params.name,
        faction: params.faction,
        cards: params.cardIds,
        core_card_ids: params.coreCardIds,
        is_active: true,
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, deckId: data.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '保存に失敗しました',
    };
  }
}

/**
 * ユーザーのデッキ一覧を取得
 */
export async function getUserDecks(): Promise<{
  success: boolean;
  decks?: DeckData[];
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

    // デッキ取得
    const { data, error } = await supabase
      .from('decks')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, decks: data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'デッキの取得に失敗しました',
    };
  }
}

/**
 * デッキを削除
 */
export async function deleteDeck(deckId: string): Promise<{
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

    // デッキ削除（RLSポリシーでuser_idが一致するもののみ削除可能）
    const { error } = await supabase.from('decks').delete().eq('id', deckId).eq('user_id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '削除に失敗しました',
    };
  }
}

/**
 * デッキを更新
 */
export async function updateDeck(
  deckId: string,
  params: Partial<SaveDeckParams>
): Promise<{
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

    // 更新データ準備
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (params.name) updateData.name = params.name;
    if (params.faction) updateData.faction = params.faction;
    if (params.cardIds) updateData.cards = params.cardIds;
    if (params.coreCardIds) updateData.core_card_ids = params.coreCardIds;

    // デッキ更新（RLSポリシーでuser_idが一致するもののみ更新可能）
    const { error } = await supabase
      .from('decks')
      .update(updateData)
      .eq('id', deckId)
      .eq('user_id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '更新に失敗しました',
    };
  }
}
