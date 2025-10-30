import { NextResponse, type NextRequest } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createInitialGameState } from '@/lib/game-engine/core';
import { processGameStep } from '@/lib/game-engine/core';
import type { Database } from '@/types/database';
import type { Card, Faction } from '@/types/game';

/**
 * Cron Job: Pending状態のマッチを処理
 *
 * Vercel Cron Jobsから定期的に呼ばれ、バトルシミュレーションを実行します。
 * - 認証: CRON_SECRET環境変数で保護
 * - 処理: pending状態のマッチを取得 → バトル実行 → 結果保存
 *
 * eslint-disable complexity -- Cron Job処理のため複雑度制限を緩和
 */

/* eslint-disable complexity */

const MAX_TURNS = 100; // 最大ターン数（無限ループ防止）

// 型定義
type MatchUpdate = Database['public']['Tables']['matches']['Update'];
type MatchWithDecks = Database['public']['Tables']['matches']['Row'] & {
  player1_deck: { faction: Faction; cards: string[]; core_card_ids: string[] } | null;
  player2_deck: { faction: Faction; cards: string[]; core_card_ids: string[] } | null;
};

export async function GET(request: NextRequest) {
  try {
    // CRON_SECRET認証
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Supabase Admin Clientを作成（RLS回避）
    // 注意: 型推論を正しく機能させるために、createClientの呼び出しをここで直接行う
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables are not configured');
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // pending状態のマッチを取得（最大10件）
    const { data: matches, error: fetchError } = await supabase
      .from('matches')
      .select(
        `
        *,
        player1_deck:decks!matches_player1_deck_id_fkey(faction, cards, core_card_ids),
        player2_deck:decks!matches_player2_deck_id_fkey(faction, cards, core_card_ids)
      `
      )
      .eq('status', 'pending')
      .limit(10)
      .returns<MatchWithDecks[]>();

    if (fetchError) {
      console.error('Failed to fetch pending matches:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
    }

    if (!matches || matches.length === 0) {
      return NextResponse.json({ message: 'No pending matches', processed: 0 });
    }

    const results = [];

    // 各マッチを処理
    for (const match of matches) {
      try {
        const result = await processMatch(match as MatchWithDecks, supabase);
        results.push(result);
      } catch (error) {
        console.error(`Failed to process match ${match.id}:`, error);
        // エラーステータスに更新
        const errorUpdate = {
          status: 'error' as const,
          result_reason: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString(),
        } satisfies MatchUpdate;
        await supabase
          .from('matches')
          .update(errorUpdate as never)
          .eq('id', match.id);
      }
    }

    return NextResponse.json({
      message: 'Matches processed',
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 個別マッチの処理
 */
async function processMatch(
  match: MatchWithDecks,
  supabase: SupabaseClient<Database>
): Promise<{ matchId: string; winner: string; turns: number }> {
  const startTime = Date.now();

  // デッキデータの検証
  if (!match.player1_deck || !match.player2_deck) {
    throw new Error('Deck data not found');
  }

  // カードテンプレートIDからCard[]に変換
  const player1Cards = await getCardsByTemplateIds(
    match.player1_deck.cards,
    match.player1_deck.faction
  );
  const player2Cards = await getCardsByTemplateIds(
    match.player2_deck.cards,
    match.player2_deck.faction
  );

  // ゲーム状態初期化
  const randomSeed = `match-${match.id}-${Date.now()}`;
  let gameState = createInitialGameState(
    match.id,
    player1Cards,
    player2Cards,
    match.player1_deck.faction,
    match.player2_deck.faction,
    randomSeed
  );

  // バトルシミュレーション実行
  let turnCount = 0;

  while (!gameState.result && turnCount < MAX_TURNS) {
    gameState = processGameStep(gameState);
    turnCount++;
  }

  // 勝者判定
  const winner = gameState.result?.winner;
  const winnerId =
    winner === 'player1' ? match.player1_id : winner === 'player2' ? match.player2_id : null;

  const resultReason = gameState.result?.reason || 'unknown';
  const durationSeconds = Math.floor((Date.now() - startTime) / 1000);

  // リプレイログ作成
  const replayLog = {
    matchId: match.id,
    player1: {
      id: match.player1_id,
      faction: match.player1_deck.faction,
      deck: player1Cards.map((c) => c.templateId),
    },
    player2: {
      id: match.player2_id,
      faction: match.player2_deck.faction,
      deck: player2Cards.map((c) => c.templateId),
    },
    actions: gameState.actionLog,
    finalState: {
      winner: winner,
      totalTurns: gameState.turnNumber,
      player1HP: gameState.players.player1.life,
      player2HP: gameState.players.player2.life,
    },
  };

  // データベースに結果保存
  const completedUpdate: MatchUpdate = {
    winner_id: winnerId,
    result_reason: resultReason,
    total_turns: gameState.turnNumber,
    duration_seconds: durationSeconds,
    replay_log:
      replayLog as unknown as Database['public']['Tables']['matches']['Row']['replay_log'],
    status: 'completed' as const,
    completed_at: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from('matches')
    .update(completedUpdate as never)
    .eq('id', match.id);

  if (updateError) {
    throw new Error(`Failed to update match: ${updateError.message}`);
  }

  // ユーザー統計を更新（オプショナル）
  // TODO: user_stats テーブルの更新処理を追加

  return {
    matchId: match.id,
    winner: winnerId || 'draw',
    turns: gameState.turnNumber,
  };
}

/**
 * カードテンプレートIDからCard[]を生成
 */
async function getCardsByTemplateIds(templateIds: string[], faction: Faction): Promise<Card[]> {
  // 全カードテンプレートを取得
  const { getCardsByFaction } = await import('@/data/cards/base-cards');
  const allCards = getCardsByFaction(faction);

  // テンプレートIDに基づいてカードインスタンスを生成
  return templateIds.map((templateId) => {
    const template = allCards.find((c: Card) => c.templateId === templateId);
    if (!template) {
      throw new Error(`Card template not found: ${templateId}`);
    }
    return template;
  });
}
