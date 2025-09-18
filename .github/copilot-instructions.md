# Ashenhall 向け Copilot 指示書（開発者向け）

このファイルは、AI コーディングエージェントがこのリポジトリで素早く生産的に作業できるように、実用的で簡潔な指示をまとめたものです。

指示は簡潔に保ち、小さく確実な変更を優先し、ロジックを変更する際は必ずテストを実行してください。

重要なリポジトリルール（`/.clinerules/custom_instructions.md` より）

- 原則として、ユーザーから明示的な指示がない限り常に日本語で返答してください。
- 大きな作業を始める前に、`PROJECT_STRATEGY.md`、`GAME_DESIGN.md`、および `package.json` を必ず参照し、プロジェクトの全体戦略・ゲーム設計・技術環境を理解してください。
- 個人開発の制約を尊重し、保守性を優先して小さく段階的な変更を行ってください。
- コアなゲーム制約（デッキサイズ、勢力数、時間制約等）をユーザーが明示的に要求しない限り変更提案しないでください。
- チャット上の挙動に関して指示がある場合は、開発原則を逐語的にチャット応答の先頭に出力してください。リポジトリポリシーとしてこれが必要な場合は、ユーザーの指示に従ってください。

  - 必須のチャット挙動: ユーザー（またはリポジトリルール）が要求した場合、以下の開発原則をチャット応答の先頭に、他の内容より前に逐語的に出力してください：

    "Ashenhall 開発原則（ルール忘れ防止システム）\n\n**第 1 原則**：AI は作業開始前に必ず PROJECT_STRATEGY.md、GAME_DESIGN.md、package.json を参照し、プロジェクトの全体戦略・ゲーム設計・技術環境を理解する。\n\n**第 2 原則**：AI は個人開発制約（時間・予算・保守性）を最優先に考慮し、技術的完璧さより持続可能性を重視する。\n\n**第 3 原則**：AI はゲーム設計の核心制約（20 枚デッキ、5 勢力、戦闘計算 5 秒以内等）を絶対に変更提案してはならない。\n\n**第 4 原則**：AI は保守性 > パフォーマンス、学習コスト最小化 > 最新技術採用の優先度を厳守する。\n\n**第 5 原則**：AI は段階的開発方針（Phase 0→1→2）を常に意識し、現在の Phase に適さない機能提案を避ける。\n\n**第 6 原則**：AI は全てのチャットの冒頭にこの Ashenhall 開発原則を逐語的に必ず画面出力してから対応する。"

主なポイント

- プロジェクト種別: Next.js 15 + React 19 + TypeScript（フロントエンド中心のゲームエンジン + テスト）
- パッケージマネージャ: `pnpm`（`pnpm install`、`pnpm dev`、`pnpm build`、`pnpm test` を使用）
- テスト: Jest + ts-jest。高速テストランナーオプション: `pnpm test:quick` と `pnpm test:simulation:quick`。

アーキテクチャ & 重要ファイル

- ゲームエンジンコア: `src/lib/game-engine/core.ts` — `processGameStep` を実行しゲーム状態を進める。
- ゲーム状態モデル: `src/lib/game-engine/game-state.ts` と型定義 `src/types/game.ts`。
- アクションログ: `src/lib/game-engine/action-logger.ts` — 状態を変更する際は `addCreatureDestroyedAction` 等のヘルパーを使ってアクションログを追加する。
- シーケンシャル処理 & UI 同期: `src/lib/game-engine/completion-aware-processor.ts` とフック `src/hooks/useSequentialGameProgress.ts`。
- 統一コマンド処理: `src/lib/game-engine/unified-action-system.ts` — ダメージ/破壊等のコマンドを処理し、テスト環境ではアニメーションをスキップする設計。
- カード効果レジストリ: `src/lib/game-engine/card-effects.ts` と `effects/` ディレクトリ — 新しい効果実装はここに追加。

パターン & 慣習

- 決定論的ロジック: ゲームロジックは純粋で決定論的であるべきです。状態遷移は `processGameStep` と `UnifiedActionProcessor` を使って実施してください。
- アクションログが正本: 状態変化は `action-logger` のヘルパーでアクションログに追加し、UI は `actionLog` の差分から演出を派生させます。
- テスト環境の差分: `process.env.NODE_ENV === 'test'` の判定でアニメーション等を短絡します。テストを書く際はこれを尊重してください。
- ゲーム速度: `gameSpeed` がアニメーション長を割る値として機能します。`CompletionAwareProcessor.setGameSpeed` を使って下さい。
- 副作用は最小限に: `GameState` の変更は提供されたヘルパーを使い、テスト用の状態作成では `cloneGameState`/`createInitialGameState` を使ってください。

思考プロセス & 分析ガイダンス

- 設計やロジックの判断を要するタスクでは、次の簡潔な構造に従って分析してください: 1) 要件と制約の分解、2) 少なくとも 2〜3 の代替案列挙、3) トレードオフの提示（性能、保守性、開発コスト）、4) 個人開発者向けに実行可能で妥当な解決策の選定。

プロジェクト制約（ユーザーが要求しない限り変更しないこと）

- デッキ枚数: 20 枚（固定）
- 勢力数: 5
- 戦闘計算時間の目標: 5 秒以内

テスト & デバッグ

- テストスイートは `pnpm test`、開発での高速確認は `pnpm test:quick` を使用してください。
- AI バトルシミュレーションのテストは `pnpm test:simulation` または `pnpm test:simulation:quick` を使用します。
- コアロジックを編集する際は、影響を受けるテストのみを先に実行してください。テスト用ヘルパーは `src/test-helpers/` にまとまっています。

例（振る舞いを変更する箇所）

- 破壊演出時間を変更するには: `completion-aware-processor.ts`（duration: 1000）と必要に応じて `unified-action-system.ts`（duration: 800）を編集してください。両方を揃えると一貫性が保てます。
- `on_death` 効果を追加するには: `src/lib/game-engine/effects/` に実装を追加し、`effect-registry.ts` に登録し、必要箇所で `processEffectTrigger` を呼んでください。
- 新しいアクションタイプをログに残すには: `action-logger.ts` にヘルパーを追加し、`src/types/game.ts` の `GameAction` ユニオンに型を追記してください。

コードスタイル & コミットガイダンス

- 変更は小さく焦点を絞って行ってください。リポジトリは明瞭さを重視します。
- ゲームロジックに変更を加えた場合は、必ずユニットテストを追加または更新してください（`src/__tests__/**`）。
- PR を作成する前にローカルで `pnpm test` を実行してください。

不明点が残る場合は、次を教えてください: 失敗している具体的なテスト、例示用のゲーム状態、またはどの UI コンポーネントが特定の演出を描画しているか。
