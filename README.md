# Ashenhall - 時間を選ばない戦略カードゲーム

**Ashenhall**は時間を選ばない戦略体験を提供するカードゲームです。いつでも対戦申請、あとは待つだけ。

## ゲーム概要

### 🎮 基本コンセプト
- **非同期対戦**: いつでも対戦申請、あとは待つだけ
- **20枚デッキ**: 奥深い戦略構築
- **5つの勢力**: 死霊術師、戦狂い、魔導士、騎士、審問官
- **戦術選択**: 攻撃重視・守備重視・速攻重視・バランス型

### 🌍 世界観
古き秩序が崩壊し、廃墟と化した大地で五つの勢力が覇権を争う暗黒の時代。
それぞれ異なる信念と哲学を持つ勢力が永劫の戦を繰り広げています。

## 開発状況

### Phase 0: ローカルMVP（現在）
- ✅ 基本ゲームシステム
- ✅ 5勢力のAI対戦
- ✅ 戦術選択システム
- 🚧 カードバランス調整中

### Phase 1: 非同期対戦α版（予定）
- 🔄 ユーザー管理システム
- 🔄 非同期対戦機能
- 🔄 リプレイ観戦機能

## 技術スタック

- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Styling**: Tailwind CSS 4
- **Testing**: Jest + TypeScript
- **Package Manager**: pnpm

### 技術的注意事項

#### Tailwind CSS v4 使用時の警告対応
- Tailwind CSS v4（ベータ版）の`@theme inline`構文使用により、CSS警告が発生する場合があります
- `.vscode/settings.json`でCSS警告を無効化済み（`css.lint.unknownAtRules: "ignore"`）
- エディターの警告は無視して開発を継続してください

## 開発環境構築

### 前提条件
- Node.js 18以降
- pnpm（推奨）

### セットアップ

```bash
# リポジトリクローン
git clone <repository-url>
cd ashenhall

# 依存関係インストール
pnpm install

# 開発サーバー起動
pnpm dev
```

### 利用可能なコマンド

```bash
# 開発サーバー起動
pnpm dev

# プロダクションビルド
pnpm build

# プロダクションサーバー起動
pnpm start

# テスト実行
pnpm test

# テスト（ウォッチモード）
pnpm test:watch

# テストカバレッジ確認
pnpm test:coverage

# 高速テスト実行（開発中推奨）
pnpm test:quick

# AIバトルシミュレーション（詳細分析用・30回実行）
pnpm test:simulation

# AIバトルシミュレーション（高速確認用・2回実行）
pnpm test:simulation:quick

# リンター実行
pnpm lint
```

### テスト実行について

**個人開発の持続可能性を重視**し、テスト実行時間を最適化しています：

- **通常開発**: `pnpm test` または `pnpm test:quick` を使用（高速実行）
- **バランス分析**: `pnpm test:simulation` を使用（詳細データ収集）
- **CI環境**: 自動的に最小実行回数で高速化

実行時間の目安：
- 通常テスト: 約2-3秒（3回シミュレーション）
- 高速テスト: 約1-2秒（2回シミュレーション）  
- 詳細テスト: 約20-30秒（30回シミュレーション）

## ゲームルール

### 基本構成
- デッキサイズ: 20枚固定
- 初期ライフ: 20
- 場の上限: 各プレイヤー5体
- エネルギー上限: 10

### 勝利条件
1. 相手のライフを0以下にする
2. 50ターン経過時にライフが多い方が勝利

### ゲームの流れ
1. 勢力とデッキを選択
2. 戦術タイプを選択
3. AI対戦を観戦
4. 結果を確認し戦略を練り直す

## 開発方針

### 制約と目標
- **個人開発**: 1人での実装・運用
- **予算制限**: 月額運用費用を最小限に抑制
- **開発期間**: 6ヶ月でMVP完成目標

### 技術選択基準
1. 個人開発の持続可能性最優先
2. 保守性 > パフォーマンス
3. 学習コスト最小化 > 最新技術採用
4. 段階的拡張可能性を重視

## ライセンス

このプロジェクトは個人開発プロジェクトです。

## フィードバック

バグ報告や改善提案は Issues までお願いします。

---

*「時の流れに縛られず、戦略で勝負せよ」*

## アニメーション CSS の自動生成

アニメーションの持続時間（ミリ秒）は `src/lib/game-engine/animation-durations.ts` で定義されています。
この値から CSS の変数ファイルを自動生成し、TS と CSS の同期を保つ仕組みがあります。

手動で生成するには:

```bash
pnpm run gen:animations
```

CI とビルドでは自動的に生成が行われます（`prebuild` フックおよび GitHub Actions）。

もし `animation-durations.ts` を変更した場合は、`pnpm run gen:animations` を実行して生成ファイルを更新し、必要に応じて変更をコミットしてください。

## アクションログ メトリクスとドリフト監視

ゲームロジックの意図しない複雑化やアクション膨張を早期検知するため、シミュレーション結果からアクションログ統計のベースラインとドリフトチェックを行う仕組みがあります。

### 目的
- ロジック変更で総アクション数が過剰に増えた回帰を検知
- 戦闘ステージ比率の異常増減を検知 (将来的拡張余地)
- 意図的な仕様追加とバグ的増加を切り分ける判断材料

### 基本指標（現状）
- `totalActions.avg`: 1 ゲームあたりアクション総数平均
- `combatStageRatio.avg`: 全アクションに占める `combat_stage` アクション比率（現状 0、拡張予定）

### ベースライン生成
初回、または意図的な仕様増加が確定した後にベースラインを更新します。
```bash
pnpm metrics:baseline
```
生成ファイル: `simulation_reports/metrics-baseline-<timestamp>.json`

### ドリフトチェック
```bash
pnpm metrics:check
```
出力: `simulation_reports/metrics-drift-check-<timestamp>.json`（`status: OK` か `DRIFT`）。

### 高速サンプル（開発中短縮）
```bash
DRIFT_GAMES=2 DRIFT_MAX_STEPS=300 pnpm metrics:check
```

### 環境変数（閾値/制御）
| 変数 | デフォルト | 説明 |
|------|------------|------|
| `DRIFT_GAMES` | 6 | シミュレーションゲーム数 |
| `DRIFT_MAX_STEPS` | 2000 | 1 ゲーム最大ステップ |
| `DRIFT_SEED_BASE` | 9000 | 連番シード基点 |
| `DRIFT_MAX_ACTION_INCREASE_PCT` | 0.20 | totalActions.avg の相対増加許容 (20%) |
| `DRIFT_MAX_ACTION_ABS_INCREASE` | 50 | totalActions.avg 絶対増加許容 |
| `DRIFT_MAX_COMBAT_RATIO_INCREASE` | 0.10 | combatStageRatio.avg の許容増加 (10pp) |

判定ロジック:
- 総アクション: 相対増加 > 指定割合 かつ 絶対増加 > 指定値 の場合 DRIFT
- combatStageRatio: 絶対増加 > 指定値 の場合 DRIFT

### 運用フロー推奨
1. 変更前に基準がなければ baseline 生成
2. 実装 → `pnpm metrics:check`
3. DRIFT の場合: 仕様上正当かを確認
	- 正当: baseline 再生成してコミット
	- 不正当: ロジック修正

### 追加拡張アイデア（未実装）
- フェーズ別比率（draw/energy/deploy/battle/end）
- アクションタイプ個別しきい値（`effect_trigger` 等）
- CI での差分 PR コメント自動投稿

### 注意
現在 `combat_stage` が 0 のため、将来バトル細分化アクション追加時に自然に比率監視が有効化されます。


