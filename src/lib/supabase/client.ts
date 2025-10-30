/**
 * Supabase クライアント (ブラウザ用)
 *
 * クライアントサイドコンポーネント（'use client'）から使用します。
 * Cookieベースのセッション管理を提供します。
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
