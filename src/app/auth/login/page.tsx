'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        // サインアップ処理
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;

        setMessage({
          type: 'success',
          text: '確認メールを送信しました。メールボックスをご確認ください。',
        });
        setEmail('');
        setPassword('');
      } else {
        // ログイン処理
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        setMessage({
          type: 'success',
          text: 'ログインしました。',
        });

        // ホームページにリダイレクト
        router.push('/');
        router.refresh();
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '認証エラーが発生しました',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold mb-6 text-center">
            {isSignUp ? '新規登録' : 'ログイン'}
          </h1>

          {message && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-900/30 border border-green-500 text-green-400'
                  : 'bg-red-900/30 border border-red-500 text-red-400'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 transition"
                placeholder="example@email.com"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 transition"
                placeholder="6文字以上"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition"
            >
              {loading ? '処理中...' : isSignUp ? '登録する' : 'ログイン'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setMessage(null);
              }}
              className="text-blue-400 hover:text-blue-300 text-sm transition"
              disabled={loading}
            >
              {isSignUp
                ? 'すでにアカウントをお持ちですか？ログイン'
                : 'アカウントをお持ちでない方はこちら'}
            </button>
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="text-gray-400 hover:text-gray-300 text-sm transition">
              ← ホームに戻る
            </Link>
          </div>
        </div>

        {isSignUp && (
          <div className="mt-4 p-4 bg-blue-900/20 border border-blue-700 rounded-lg text-sm text-gray-300">
            <p className="font-bold mb-2">📧 メール確認について</p>
            <p>
              登録後、確認メールが送信されます。メール内のリンクをクリックして認証を完了してください。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
