/**
 * Ashenhall 統一コマンドシステム型定義
 * 
 * 設計方針:
 * - 論理順序と演出順序の統一
 * - 環境別分岐の完全排除
 * - テスト互換性100%維持
 */

import type { FieldCard, PlayerId, GameState } from './game';

/** ゲームコマンドの基本タイプ */
export type GameCommandType = 
  | 'damage'
  | 'heal' 
  | 'destroy'
  | 'buff_attack'
  | 'buff_health'
  | 'debuff_attack'
  | 'debuff_health'
  | 'summon'
  | 'draw_card'
  | 'silence'
  | 'stun';

/** コマンド実行タイミング */
export type ExecutionTiming = 'immediate' | 'after_animation';

/** ゲームコマンド基底インターフェース */
export interface BaseGameCommand {
  /** コマンド種別 */
  type: GameCommandType;
  /** 実行タイミング（テスト環境では常にimmediate） */
  timing: ExecutionTiming;
  /** 対象ID群（FieldCard.id または PlayerId） */
  targetIds: string[];
  /** 効果値 */
  value: number;
  /** 効果の発生源カードID */
  sourceId: string;
  /** 実行優先度（同時発生時の順序制御） */
  priority: number;
  /** 依存コマンドID（実行順序制御） */
  dependencies: string[];
  /** コマンド一意識別子 */
  id: string;
}

/** ダメージコマンド */
export interface DamageCommand extends BaseGameCommand {
  type: 'damage';
  /** プレイヤーへのダメージか */
  targetsPlayer?: boolean;
}

/** 破壊コマンド（handleCreatureDeath置換） */
export interface DestroyCommand extends BaseGameCommand {
  type: 'destroy';
  /** 破壊原因 */
  source: 'combat' | 'effect';
  /** 破壊対象カード */
  targetCard: FieldCard;
}

/** 回復コマンド */
export interface HealCommand extends BaseGameCommand {
  type: 'heal';
  /** プレイヤーへの回復か */
  targetsPlayer?: boolean;
}

/** バフコマンド */
export interface BuffCommand extends BaseGameCommand {
  type: 'buff_attack' | 'buff_health';
  /** 永続効果かパッシブ効果か */
  effectType: 'permanent' | 'passive';
}

/** デバフコマンド */
export interface DebuffCommand extends BaseGameCommand {
  type: 'debuff_attack' | 'debuff_health';
}

/** 召喚コマンド */
export interface SummonCommand extends BaseGameCommand {
  type: 'summon';
  /** 召喚するカードID */
  cardId: string;
  /** 召喚位置 */
  position: number;
}

/** ドローコマンド */
export interface DrawCommand extends BaseGameCommand {
  type: 'draw_card';
}

/** 沈黙コマンド */
export interface SilenceCommand extends BaseGameCommand {
  type: 'silence';
}

/** スタンコマンド */
export interface StunCommand extends BaseGameCommand {
  type: 'stun';
  /** スタン持続時間 */
  duration: number;
}

/** 全コマンドタイプのUnion */
export type GameCommand = 
  | DamageCommand
  | DestroyCommand  
  | HealCommand
  | BuffCommand
  | DebuffCommand
  | SummonCommand
  | DrawCommand
  | SilenceCommand
  | StunCommand;

/** コマンド実行結果 */
export interface CommandExecutionResult {
  /** 更新されたゲーム状態 */
  newGameState: GameState;
  /** スケジュールされたアニメーション */
  scheduledAnimations: AnimationCommand[];
  /** 実行されたコマンド数 */
  executedCommandCount: number;
  /** エラーが発生したコマンド */
  failedCommands: Array<{ command: GameCommand; error: string }>;
}

/** アニメーションコマンド */
export interface AnimationCommand {
  /** 対象カードID */
  targetCardId: string;
  /** アニメーションタイプ */
  type: 'attacking' | 'being_attacked' | 'dying' | 'taking_damage' | 'healing' | 'buffing';
  /** 開始遅延時間（ms） */
  delay: number;
  /** アニメーション時間（ms） */
  duration: number;
  /** 関連するゲームコマンドID */
  sourceCommandId: string;
}

/** コマンドバッチ（同時実行コマンド群） */
export interface CommandBatch {
  /** バッチ内のコマンド */
  commands: GameCommand[];
  /** バッチ実行順序 */
  sequence: number;
  /** アニメーション情報 */
  animations: AnimationCommand[];
}

/** 統一アクションプロセッサー設定 */
export interface UnifiedActionConfig {
  /** テスト環境フラグ（true時は全て即座実行） */
  isTestEnvironment: boolean;
  /** ゲーム速度（アニメーション時間の調整用） */
  gameSpeed: number;
  /** デバッグログ出力 */
  enableDebugLog: boolean;
}
