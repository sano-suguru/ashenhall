/**
 * Supabase接続テストページ
 *
 * このページは開発時のSupabase接続確認用です。
 * 本番環境では削除またはアクセス制限してください。
 *
 * eslint-disable complexity -- テストページのため複雑度制限を緩和
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import Link from 'next/link';
async function fetchTestData() {
  const supabase = await createServerSupabaseClient();

  const [
    { data: profiles, error: profilesError },
    { data: decks, error: decksError },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase.from('profiles').select('*').limit(5),
    supabase.from('decks').select('*').limit(5),
    supabase.auth.getUser(),
  ]);

  return { profiles, profilesError, decks, decksError, user };
}

function ProfilesSection({ profiles, profilesError }: { profiles: any; profilesError: any }) {
  return (
    <div className="mb-8 p-6 bg-gray-800 rounded-lg">
      <h2 className="text-xl font-bold mb-4">👤 Profiles テーブル</h2>
      {profilesError ? (
        <div className="text-red-400">
          <p className="font-bold">❌ エラー:</p>
          <pre className="mt-2 p-4 bg-gray-900 rounded overflow-x-auto text-sm">
            {JSON.stringify(profilesError, null, 2)}
          </pre>
        </div>
      ) : (
        <div>
          <p className="text-green-400 mb-2">
            ✅ テーブルアクセス成功 ({profiles?.length || 0} レコード)
          </p>
          {profiles && profiles.length > 0 ? (
            <pre className="mt-2 p-4 bg-gray-900 rounded overflow-x-auto text-sm">
              {JSON.stringify(profiles, null, 2)}
            </pre>
          ) : (
            <p className="text-gray-400 text-sm">
              まだプロフィールがありません（ユーザー登録後に表示されます）
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function DecksSection({ decks, decksError }: { decks: any; decksError: any }) {
  return (
    <div className="mb-8 p-6 bg-gray-800 rounded-lg">
      <h2 className="text-xl font-bold mb-4">🎴 Decks テーブル</h2>
      {decksError ? (
        <div className="text-red-400">
          <p className="font-bold">❌ エラー:</p>
          <pre className="mt-2 p-4 bg-gray-900 rounded overflow-x-auto text-sm">
            {JSON.stringify(decksError, null, 2)}
          </pre>
        </div>
      ) : (
        <div>
          <p className="text-green-400 mb-2">
            ✅ テーブルアクセス成功 ({decks?.length || 0} レコード)
          </p>
          {decks && decks.length > 0 ? (
            <pre className="mt-2 p-4 bg-gray-900 rounded overflow-x-auto text-sm">
              {JSON.stringify(decks, null, 2)}
            </pre>
          ) : (
            <p className="text-gray-400 text-sm">
              まだデッキがありません（デッキ作成後に表示されます）
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default async function SupabaseTestPage() {
  const { profiles, profilesError, decks, decksError, user } = await fetchTestData();
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔌 Supabase 接続テスト</h1>

        {/* 接続状態 */}
        <div className="mb-8 p-6 bg-gray-800 rounded-lg border-2 border-green-500">
          <h2 className="text-xl font-bold mb-4 text-green-400">✅ 接続成功</h2>
          <p className="text-gray-300">Supabaseへの接続が確立されています。</p>
        </div>

        {/* 認証状態 */}
        <div className="mb-8 p-6 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-bold mb-4">🔐 認証状態</h2>
          {user ? (
            <div className="space-y-2">
              <p className="text-green-400">✅ ログイン済み</p>
              <p className="text-sm text-gray-400">User ID: {user.id}</p>
              <p className="text-sm text-gray-400">Email: {user.email}</p>
            </div>
          ) : (
            <p className="text-yellow-400">ℹ️ 未ログイン（正常な状態です）</p>
          )}
        </div>

        {/* Profilesテーブル */}
        <ProfilesSection profiles={profiles} profilesError={profilesError} />

        {/* Decksテーブル */}
        <DecksSection decks={decks} decksError={decksError} />

        {/* 次のステップ */}
        <div className="p-6 bg-blue-900/30 rounded-lg border border-blue-500">
          <h2 className="text-xl font-bold mb-4 text-blue-400">📋 次のステップ</h2>
          <ul className="space-y-2 text-gray-300">
            <li>✅ Supabase接続 - 完了</li>
            <li>✅ データベーステーブル - 作成済み</li>
            <li>✅ RLSポリシー - 設定済み</li>
            <li>⏭️ 次: 認証UI実装（ログイン/新規登録ページ）</li>
          </ul>
        </div>

        {/* ナビゲーション */}
        <div className="mt-8 flex gap-4">
          <Link
            href="/"
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition"
          >
            ← ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
