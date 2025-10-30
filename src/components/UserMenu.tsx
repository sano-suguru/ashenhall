'use client';

import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { LogOut, User } from 'lucide-react';

/**
 * ユーザーメニューコンポーネント
 *
 * 認証状態に応じてログイン/ログアウトボタンを表示します。
 */
export default function UserMenu() {
  const { user, loading, signOut, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-gray-400">
        <div className="w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-gray-300">
          <User size={20} />
          <span className="text-sm">{user.email}</span>
        </div>
        <button
          onClick={signOut}
          className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
        >
          <LogOut size={18} />
          <span>ログアウト</span>
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/auth/login"
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
    >
      ログイン
    </Link>
  );
}
