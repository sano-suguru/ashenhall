-- マイグレーション: replay_log を nullable に変更
-- pending 状態のマッチでは replay_log が null になるため

ALTER TABLE public.matches ALTER COLUMN replay_log DROP NOT NULL;
