/**
 * Cron Job のローカルテストスクリプト
 *
 * 使い方:
 * 1. npx tsx scripts/test-cron-job.ts setup - テストデータを作成
 * 2. npx tsx scripts/test-cron-job.ts trigger - Cron Job を手動実行
 * 3. npx tsx scripts/test-cron-job.ts check - 結果を確認
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/database';

// .env.local を読み込み
config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const cronSecret = process.env.CRON_SECRET;

if (!supabaseUrl || !supabaseServiceKey || !cronSecret) {
  console.error('❌ 環境変数が設定されていません');
  console.error('必要な環境変数: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

async function setup() {
  console.log('🔧 テストデータを作成します...\n');

  // テスト用デッキを2つ取得（存在しない場合はエラー）
  const { data: decks, error: deckError } = await supabase
    .from('decks')
    .select('id, user_id, name, faction')
    .limit(2)
    .returns<Array<{ id: string; user_id: string; name: string; faction: string }>>();

  if (deckError || !decks || decks.length < 2) {
    console.error('❌ デッキが2つ以上必要です。まずデッキを作成してください。');
    process.exit(1);
  }

  const [deck1, deck2] = decks;
  console.log(`✓ デッキ1: ${deck1.name} (${deck1.faction}) - User: ${deck1.user_id}`);
  console.log(`✓ デッキ2: ${deck2.name} (${deck2.faction}) - User: ${deck2.user_id}\n`);

  // 既存のテストマッチを削除
  await supabase.from('matches').delete().eq('player1_deck_id', deck1.id);
  await supabase.from('matches').delete().eq('player2_deck_id', deck2.id);

  // テストマッチを作成
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      player1_id: deck1.user_id,
      player1_deck_id: deck1.id,
      player2_id: deck2.user_id,
      player2_deck_id: deck2.id,
      status: 'pending' as const,
      replay_log: null,
    } as never)
    .select()
    .single();

  if (matchError || !match) {
    console.error('❌ マッチの作成に失敗しました:', matchError);
    process.exit(1);
  }

  const createdMatch = match as { id: string; status: string };

  console.log(`✅ テストマッチを作成しました: ${createdMatch.id}`);
  console.log(`   Status: ${createdMatch.status}`);
  console.log(`\n次のコマンドを実行してください:`);
  console.log(`pnpm tsx scripts/test-cron-job.ts trigger\n`);
}

async function trigger() {
  console.log('🚀 Cron Job を実行します...\n');

  // サーバーが起動しているか確認
  try {
    await fetch('http://localhost:3000');
  } catch {
    console.error('❌ 開発サーバーが起動していません。');
    console.error('別のターミナルで "pnpm dev" を実行してください。\n');
    process.exit(1);
  }

  const response = await fetch('http://localhost:3000/api/cron/process-matches', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${cronSecret}`,
    },
  });

  if (!response.ok) {
    console.error(`❌ Cron Job の実行に失敗しました: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.error(text);
    process.exit(1);
  }

  const result = await response.json();
  console.log('✅ Cron Job が正常に実行されました:');
  console.log(JSON.stringify(result, null, 2));
  console.log(`\n次のコマンドを実行してください:`);
  console.log(`pnpm tsx scripts/test-cron-job.ts check\n`);
}

async function check() {
  console.log('🔍 結果を確認します...\n');

  type MatchResult = {
    id: string;
    status: 'pending' | 'completed' | 'error';
    winner_id: string | null;
    result_reason: string | null;
    total_turns: number | null;
    duration_seconds: number | null;
    created_at: string;
  };

  const { data: matches, error } = await supabase
    .from('matches')
    .select('id, status, winner_id, result_reason, total_turns, duration_seconds, created_at')
    .order('created_at', { ascending: false })
    .limit(5)
    .returns<MatchResult[]>();

  if (error || !matches) {
    console.error('❌ マッチの取得に失敗しました:', error);
    process.exit(1);
  }

  console.log('📊 最新のマッチ結果 (最大5件):\n');
  matches.forEach((match, index) => {
    console.log(`${index + 1}. Match ID: ${match.id}`);
    console.log(`   Status: ${match.status}`);
    if (match.status === 'completed') {
      console.log(`   Winner: ${match.winner_id || 'Draw'}`);
      console.log(`   Reason: ${match.result_reason}`);
      console.log(`   Turns: ${match.total_turns}`);
      console.log(`   Duration: ${match.duration_seconds}s`);
    }
    console.log('');
  });

  const completedCount = matches.filter((m) => m.status === 'completed').length;
  const pendingCount = matches.filter((m) => m.status === 'pending').length;
  const errorCount = matches.filter((m) => m.status === 'error').length;

  console.log(`✅ 完了: ${completedCount} / ⏳ 保留: ${pendingCount} / ❌ エラー: ${errorCount}\n`);
}

const command = process.argv[2];

switch (command) {
  case 'setup':
    setup();
    break;
  case 'trigger':
    trigger();
    break;
  case 'check':
    check();
    break;
  default:
    console.log('使い方:');
    console.log('  pnpm tsx scripts/test-cron-job.ts setup   - テストデータを作成');
    console.log('  pnpm tsx scripts/test-cron-job.ts trigger - Cron Job を手動実行');
    console.log('  pnpm tsx scripts/test-cron-job.ts check   - 結果を確認');
    process.exit(1);
}
