/**
 * Ashenhall ゲーム状態管理型定義
 * 
 * 設計方針:
 * - ゲームの進行状況とプレイヤー状態
 * - 戦闘ログとアクションシステム
 * - ゲーム結果の記録
 */

import type {
  PlayerId,
  Faction,
  TacticsType,
  GamePhase
} from './core';

import type {
  EffectTrigger,
  EffectAction,
  Keyword
} from './effects';

import type {
  Card,
  FieldCard
} from './cards';

// === プレイヤー状態 ===

/** プレイヤー状態 */
export interface PlayerState {
  /** プレイヤーID */
  id: PlayerId;
  /** ライフポイント */
  life: number;
  /** 現在のエネルギー */
  energy: number;
  /** 最大エネルギー */
  maxEnergy: number;
  /** 選択勢力 */
  faction: Faction;
  /** 戦術タイプ */
  tacticsType: TacticsType;
  /** デッキ（未使用のカード） */
  deck: Card[];
  /** 手札 */
  hand: Card[];
  /** 場のカード */
  field: FieldCard[];
  /** 墓地 */
  graveyard: Card[];
  /** 消滅したカード（蘇生不可） */
  banishedCards: Card[];
}

// === アクションログシステム ===

/** 値の変化を記録する汎用インターフェース */
export interface ValueChange {
  attack?: { before: number; after: number };
  health?: { before: number; after: number };
  life?: { before: number; after: number };
  energy?: { before: number; after: number };
}

/** カードプレイアクションデータ */
export interface CardPlayActionData {
  cardId: string;
  position: number;
  initialStats?: { attack: number; health: number };
  playerEnergy?: { before: number; after: number };
}

/** カード攻撃アクションデータ */
export interface CardAttackActionData {
  attackerCardId: string;
  targetId: string; // 'player' も含む
  damage: number;
  attackerHealth?: { before: number; after: number };
  targetHealth?: { before: number; after: number };
  targetPlayerLife?: { before: number; after: number };
}

/** クリーチャー破壊アクションデータ */
export interface CreatureDestroyedActionData {
  destroyedCardId: string;
  source: 'combat' | 'effect';
  sourceCardId?: string; // effectの場合
  cardSnapshot?: {
    id: string;
    owner: PlayerId;
    name: string;
    attackTotal: number;
    healthTotal: number;
    currentHealth: number;
    baseAttack: number;
    baseHealth: number;
    keywords: string[];
  };
}

/** 効果発動アクションデータ */
// system 起因 (例: 'deck_empty','poison_effect','turn_system' 等) を明示するための列挙。
// 将来: 需要が増えたら別ファイルへ抽出。
export type SystemEffectSource =
  | 'deck_empty'
  | 'poison_effect'
  | 'turn_system';

export interface EffectTriggerActionData {
  /**
   * 効果ソース。
   * - 召喚/場上カード: 実カードID
   * - システム効果: SystemEffectSource 文字列
   */
  sourceCardId: string | SystemEffectSource;
  effectType: EffectAction;
  effectValue: number;
  targets: Record<string, ValueChange>; // targetIdをキーとする
}

/** フェーズ変更アクションデータ */
export interface PhaseChangeActionData {
  /** 変更前のフェーズ */
  fromPhase: GamePhase;
  /** 変更後のフェーズ */
  toPhase: GamePhase;
}

/** エネルギー更新アクションデータ */
export interface EnergyUpdateActionData {
  maxEnergyBefore: number;
  maxEnergyAfter: number;
}

/** トリガーイベントアクションデータ */
export interface TriggerEventActionData {
  triggerType: EffectTrigger;
  sourceCardId?: string;
  targetCardId?: string;
}

/** キーワードトリガーアクションデータ */
export interface KeywordTriggerActionData {
  keyword: Keyword;
  sourceCardId: string;
  targetId: string;
  value: number;
}

/** 戦闘サブステージアクションデータ (細粒度逐次化用 最小導入版) */
export interface CombatStageActionData {
  stage: 'attack_declare' | 'damage_defender' | 'damage_attacker' | 'deaths';
  attackerId: string;
  targetId?: string; // プレイヤー攻撃時は undefined
  values?: { damage?: number; retaliate?: number; destroyed?: string[] };
}

// === 新フェーズ可視化用アクションデータ ===
export interface CardDrawActionData {
  cardId: string;
  handSizeBefore: number;
  handSizeAfter: number;
  deckSizeAfter: number;
  fatigue?: { lifeBefore: number; lifeAfter: number };
}

export interface EnergyRefillActionData {
  energyBefore: number;
  energyAfter: number;
  maxEnergy: number; // 参照用（更新有無にかかわらず）
}

export interface EndStageActionData {
  stage: 'status_tick' | 'poison_damage' | 'cleanup' | 'turn_end_trigger';
}

/** 戦闘アクション（全種類のUnion型） */
export type GameAction =
  | {
      sequence: number;
      playerId: PlayerId;
      type: 'card_play';
      data: CardPlayActionData;
      timestamp: number;
    }
  | {
      sequence: number;
      playerId: PlayerId;
      type: 'card_attack';
      data: CardAttackActionData;
      timestamp: number;
    }
  | {
      sequence: number;
      playerId: PlayerId;
      type: 'creature_destroyed';
      data: CreatureDestroyedActionData;
      timestamp: number;
    }
  | {
      sequence: number;
      playerId: PlayerId;
      type: 'effect_trigger';
      data: EffectTriggerActionData;
      timestamp: number;
    }
  | {
      sequence: number;
      playerId: PlayerId;
      type: 'phase_change';
      data: PhaseChangeActionData;
      timestamp: number;
    }
  | {
      sequence: number;
      playerId: PlayerId;
      type: 'trigger_event';
      data: TriggerEventActionData;
      timestamp: number;
    }
  | {
      sequence: number;
      playerId: PlayerId;
      type: 'energy_update';
      data: EnergyUpdateActionData;
      timestamp: number;
    }
  | {
      sequence: number;
      playerId: PlayerId;
      type: 'keyword_trigger';
      data: KeywordTriggerActionData;
      timestamp: number;
    }
  | {
      sequence: number;
      playerId: PlayerId;
      type: 'combat_stage';
      data: CombatStageActionData;
      timestamp: number;
    }
  | {
      sequence: number;
      playerId: PlayerId;
      type: 'card_draw';
      data: CardDrawActionData;
      timestamp: number;
    }
  | {
      sequence: number;
      playerId: PlayerId;
      type: 'energy_refill';
      data: EnergyRefillActionData;
      timestamp: number;
    }
  | {
      sequence: number;
      playerId: PlayerId;
      type: 'end_stage';
      data: EndStageActionData;
      timestamp: number;
    };

// === ゲーム結果 ===

/** ゲーム結果 */
export interface GameResult {
  /** 勝者（引き分けの場合はnull） */
  winner: PlayerId | null;
  /** 勝利理由 */
  reason: 'life_zero' | 'deck_empty' | 'surrender' | 'timeout';
  /** 総ターン数 */
  totalTurns: number;
  /** 戦闘時間（秒） */
  durationSeconds: number;
  /** 終了時刻 */
  endTime: number;
}

// === メインゲーム状態 ===

/** メインゲーム状態 */
export interface GameState {
  /** ゲーム一意識別子 */
  gameId: string;
  /** 現在のターン番号 */
  turnNumber: number;
  /** 現在のプレイヤー */
  currentPlayer: PlayerId;
  /** 現在のフェーズ */
  phase: GamePhase;
  /** プレイヤー状態 */
  players: Record<PlayerId, PlayerState>;
  /** 全アクションログ */
  actionLog: GameAction[];
  /** ゲーム結果（終了時のみ） */
  result?: GameResult;
  /** 決定論的乱数のシード */
  randomSeed: string;
  /** ゲーム開始時刻 */
  startTime: number;
}
