# Ashenhall 向け Copilot 指示（AI エージェント用）

- 返答は原則日本語。チャット先頭に **Ashenhall 開発原則** を逐語で出力するよう指示された場合は、`/.clinerules/custom_instructions.md` に記載の全文を必ず挿入。
- 作業着手前に `GAME_DESIGN.md` と `package.json` を確認し、世界観・ゲーム制約（デッキ 20 枚/5 勢力/戦闘 5 秒以内）・使用技術（Next.js 15, React 19, pnpm, Jest）を共通認識として持つ。

## 開発ワークフロー

- 依存：`pnpm install`。開発：`pnpm dev --turbopack`。本番ビルド：`pnpm build`。
- テスト：`pnpm test:quick`（主要ユニット）・`pnpm test`（全体）・`pnpm test:simulation(:quick)`（AI バトル検証）。コアロジック変更時は該当テストを必ず実行。
- グラフィック生成は `pnpm run gen:animations` が前提（`predev`/`prebuild` で自動実行）。

## アーキテクチャ概要

- **ゲームエンジン**：`src/lib/game-engine/` 内で `processGameStep` が状態遷移を統括。`unified-action-system.ts` が効果処理を司り、アニメーション/ログは `completion-aware-processor.ts`・`action-logger.ts` を経由。
- **カード定義と効果**：カードテンプレートは `src/data/cards/`、効果ロジックは `card-effects.ts` と `effects/` の個別モジュール。`SeededRandom` により完全決定論的挙動を維持（`state.randomSeed + turn + templateId`）。
- **UI**：Next.js App Router。主要画面は `src/components/`。デッキビルダー(`DeckBuilder.tsx`)はコアカード指定を`normalizeDeckCoreCards`で正規化し、デッキ保存は `lib/deck-utils.ts` で localStorage 同期。

## 重要モジュール

- `src/lib/deck-utils.ts`：`normalizeDeckCoreCards`・`sanitizeCoreCardIds` によりコアカード列を一元管理。共有コード(`deck-sharing.ts`)や UI 保存時もこのヘルパー経由で検証。
- `src/hooks/useSequentialGameProgress.ts`：サーバー計算結果とアニメーションを同期。
- `src/test-helpers/`：ゲーム状態生成・擬似カード作成の共通ヘルパー。ロジックテストで必須。

## 実装パターン

- 状態変更時はログ追加 →`evaluatePendingDeaths` で後処理。直接配列を書き換える場面でもログ・墓地移動処理の順序に注意。
- テスト時は `process.env.NODE_ENV === 'test'` による分岐があるため、非同期アニメーションを避けたい場合はテスト環境で動作するコード経路に合わせる。
- Deck 関連は常に `coreCardIds` と `cards` を同期させる。UI からカード削除 → コア自動解除、共有コードからの読み込み → 重複除去という流れが既定。

## 作業時の心得

- 要件整理 → 代替案検討 → トレードオフ提示 → 段階的実装の順で思考を明示。
- 個人開発者向けの保守性重視。新規依存の追加や大規模リファクタは明確な理由と段階計画がない限り提案しない。
- 大規模変更前に関連ファイル（例：`GAME_DESIGN.md`、対象ディレクトリの README）を読み込み、既存方針と矛盾しないか確認。

## 参考コマンド

- `pnpm lint`（Next.js lint）・`pnpm type-check`。
- 生成スクリプト：`pnpm run gen:animations`, `pnpm run generate-animation-css`（状況により）。

不明点は、想定されるテストケース・関係コンポーネント・期待ログ出力など具体的な質問で確認すること。
