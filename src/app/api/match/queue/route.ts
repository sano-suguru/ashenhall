import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/database';

type MatchQueueInsert = Database['public']['Tables']['match_queue']['Insert'];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // 認証確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // リクエストボディから deck_id を取得
    const body = await request.json();
    const { deckId } = body;

    if (!deckId) {
      return NextResponse.json({ error: 'deck_id is required' }, { status: 400 });
    }

    // デッキの所有確認
    const { data: deck, error: deckError } = await supabase
      .from('decks')
      .select('id')
      .eq('id', deckId)
      .eq('user_id', user.id)
      .single();

    if (deckError || !deck) {
      return NextResponse.json({ error: 'Deck not found or not owned by user' }, { status: 404 });
    }

    // 既存のキューエントリを確認
    const { data: existingQueue } = await supabase
      .from('match_queue')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingQueue) {
      return NextResponse.json({ error: 'Already in queue' }, { status: 409 });
    }

    // キューに追加
    const queueEntry: MatchQueueInsert = {
      user_id: user.id,
      deck_id: deckId,
    };

    const { data, error } = await supabase
      .from('match_queue')
      .insert(queueEntry as never)
      .select()
      .single();

    if (error) {
      console.error('Queue insert error:', error);
      return NextResponse.json({ error: 'Failed to join queue' }, { status: 500 });
    }

    return NextResponse.json({ success: true, queueEntry: data }, { status: 200 });
  } catch (error) {
    console.error('Queue API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // 認証確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // キューから削除
    const { error } = await supabase.from('match_queue').delete().eq('user_id', user.id);

    if (error) {
      console.error('Queue delete error:', error);
      return NextResponse.json({ error: 'Failed to leave queue' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Queue API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
