# Supabase セットアップガイド

このガイドでは、Ashenhallプロジェクトに必要なSupabaseプロジェクトのセットアップ手順を説明します。

## 1. Supabaseプロジェクトの作成

1. [Supabase Dashboard](https://supabase.com/dashboard)にアクセス
2. 「New Project」をクリック
3. 以下の情報を入力：
   - **Name**: `ashenhall` (任意)
   - **Database Password**: 強力なパスワードを設定（保存しておく）
   - **Region**: `Northeast Asia (Tokyo)` 推奨
   - **Pricing Plan**: `Free` を選択

4. 「Create new project」をクリック（約2分でプロジェクト作成完了）

## 2. 環境変数の設定

### 2.1 API認証情報の取得

1. Supabase Dashboard で作成したプロジェクトを開く
2. 左メニューから **Settings** > **API** を選択
3. 以下の値をコピー：
   - **Project URL**: `https://xxxxxxxxxxxx.supabase.co`
   - **anon public**: `eyJhbG...` で始まる長い文字列
   - **service_role**: `eyJhbG...` で始まる長い文字列（⚠️ 公開厳禁）

### 2.2 .env.local ファイルの作成

プロジェクトルートに `.env.local` ファイルを作成し、以下を記述：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
CRON_SECRET=your-random-secret-here
```

**CRON_SECRET の生成:**

```bash
# macOS/Linux
openssl rand -base64 32

# または、任意の長いランダム文字列
```

## 3. データベーススキーマの作成

### 3.1 SQL Editorでマイグレーション実行

1. Supabase Dashboard で **SQL Editor** を開く
2. 「New query」をクリック
3. 以下のSQLを実行：

```sql
-- ユーザープロフィール拡張
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- デッキ保存
CREATE TABLE public.decks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  faction TEXT NOT NULL CHECK (faction IN ('necromancer', 'berserker', 'mage', 'knight', 'inquisitor')),
  cards JSONB NOT NULL,
  core_card_ids JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 対戦マッチング（キュー）
CREATE TABLE public.match_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  deck_id UUID REFERENCES public.decks(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 対戦結果
CREATE TABLE public.matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player1_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  player2_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  player1_deck_id UUID REFERENCES public.decks(id) ON DELETE SET NULL,
  player2_deck_id UUID REFERENCES public.decks(id) ON DELETE SET NULL,
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  result_reason TEXT,
  total_turns INTEGER,
  duration_seconds INTEGER,
  replay_log JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 統計情報
CREATE TABLE public.user_stats (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  total_games INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  faction_stats JSONB DEFAULT '{}'::jsonb,
  last_played_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_match_queue_status ON public.match_queue(status, created_at);
CREATE INDEX idx_matches_player1 ON public.matches(player1_id, created_at DESC);
CREATE INDEX idx_matches_player2 ON public.matches(player2_id, created_at DESC);
CREATE INDEX idx_decks_user ON public.decks(user_id, is_active);
```

### 3.2 Row Level Security (RLS) の設定

同じSQL Editorで以下を実行：

```sql
-- プロフィールのRLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- デッキのRLS
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own decks"
  ON public.decks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own decks"
  ON public.decks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own decks"
  ON public.decks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own decks"
  ON public.decks FOR DELETE
  USING (auth.uid() = user_id);

-- 対戦結果のRLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own matches"
  ON public.matches FOR SELECT
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- マッチキューのRLS
ALTER TABLE public.match_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own queue entries"
  ON public.match_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own queue entries"
  ON public.match_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own queue entries"
  ON public.match_queue FOR UPDATE
  USING (auth.uid() = user_id);

-- 統計のRLS
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stats"
  ON public.user_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON public.user_stats FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats"
  ON public.user_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### 3.3 新規ユーザー登録時の自動プロフィール作成

```sql
-- 新規ユーザー登録時に自動でprofilesレコードを作成
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'プレイヤー')
  );

  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## 4. 認証設定

### 4.1 メール認証の設定

1. **Authentication** > **Providers** を開く
2. **Email** が有効になっていることを確認
3. **Email Templates** でメールテンプレートをカスタマイズ（オプション）

### 4.2 URLの設定

1. **Authentication** > **URL Configuration** を開く
2. **Site URL** に本番環境のURL（例: `https://ashenhall.vercel.app`）を設定
3. **Redirect URLs** に以下を追加：
   - `http://localhost:3000/**`
   - `https://ashenhall.vercel.app/**`

## 5. 動作確認

### 5.1 開発サーバー起動

```bash
pnpm dev
```

### 5.2 接続テスト

ブラウザのコンソールで以下を実行：

```javascript
// ブラウザのコンソールで
const { createClient } = await import('/src/lib/supabase/client.ts');
const supabase = createClient();
const { data, error } = await supabase.from('profiles').select('*');
console.log({ data, error });
```

エラーがなく、空の配列が返ってくればOK！

## 6. 型定義の自動生成（オプション）

将来的にスキーマが変更された場合、型定義を自動生成できます：

```bash
# Supabase CLIのインストール
pnpm add -D supabase

# プロジェクトIDは Dashboard > Settings > General で確認
npx supabase gen types typescript --project-id <your-project-id> > src/types/database.ts
```

## トラブルシューティング

### エラー: "Invalid API key"

- `.env.local` の `NEXT_PUBLIC_SUPABASE_ANON_KEY` が正しいか確認
- 開発サーバーを再起動（`pnpm dev`）

### エラー: "relation does not exist"

- SQL Editorでテーブル作成のSQLが正しく実行されたか確認
- **Table Editor** で各テーブルが表示されるか確認

### RLSポリシーエラー

- ユーザーがログインしているか確認
- RLSポリシーのSQLが正しく実行されたか確認

## 次のステップ

✅ Supabaseセットアップ完了！

次は **Stage 2: 認証UI実装** に進みましょう。
