import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * 認証コールバックルート
 *
 * Supabaseからのメール確認リンクをクリックした際に呼ばれます。
 * 認証コードを検証してセッションを確立し、ホームページにリダイレクトします。
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
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

    // 認証コードを検証してセッションを確立
    await supabase.auth.exchangeCodeForSession(code);
  }

  // ホームページにリダイレクト
  return NextResponse.redirect(new URL('/', request.url));
}
