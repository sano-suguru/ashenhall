/**
 * Ashenhall ゲームシステムの中核型定義
 * 
 * 設計方針:
 * - 戦闘ログの完全再現が可能な構造
 * - 決定論的な戦闘計算をサポート
 * - 5勢力の非対称性を型レベルで表現
 */

// === 基本型定義 ===

/** 勢力 - 5つの異なる戦術思想を表現 */
export type Faction = 
  | 'necromancer'  // 死霊術師: 墓地活用、大量展開、復活効果
  | 'berserker'    // 戦狂い: 自己犠牲、爆発力、高リスク高リターン
  | 'mage'         // 魔導士: 魔法効果、エレメンタル召喚、呪文増幅
  | 'knight'       // 騎士: 連携効果、回復、集団戦術
  | 'inquisitor';  // 審問官: 弱体化、除去、制圧戦術

/** 戦術タイプ - AI戦闘での判断基準 */
export type TacticsType = 
  | 'aggressive'   // 攻撃重視: 攻撃力の高いカードを優先
  | 'defensive'    // 守備重視: 体力の高いカードを優先
  | 'balanced'     // バランス: コスト効率を重視
  | 'tempo';       // テンポ重視: 低コストカードを優先

/** ゲームフェーズ - ターン進行の各段階 */
export type GamePhase = 
  | 'draw'         // ドロー段階: カードドロー、手札上限チェック
  | 'energy'       // エネルギー段階: エネルギー増加
  | 'deploy'       // 配置段階: カードの自動配置（AI判断）
  | 'battle'       // 戦闘段階: クリーチャー同士の戦闘
  | 'end';         // 終了段階: ターン終了効果、勝利判定

/** プレイヤー識別子 */
export type PlayerId = 'player1' | 'player2';

// === カード関連型定義 ===

/** カードのキーワード能力 */
export type Keyword =
  | 'guard'      // 守護: このクリーチャーがいる限り、他の味方は攻撃されない
  | 'lifesteal'  // 生命奪取: 与えたダメージ分プレイヤーを回復
  | 'stealth'    // 潜伏: 1ターンの間、対象にならない
  | 'poison'     // 毒: ダメージを与えた敵に継続ダメージ
  | 'retaliate' // 反撃: 攻撃された時に反撃ダメージ
  | 'echo' // 残響: 墓地のカード枚数を参照
  | 'formation' // 連携: 味方クリーチャーの数を参照
  | 'rush' // 速攻: 召喚ターンに攻撃可能
  | 'trample' // 貫通: ブロッカーの体力を超えたダメージをプレイヤーに与える
  | 'untargetable'; // 対象不可: 相手のスペルや効果の対象にならない

/** カード効果の発動タイミング */
export type EffectTrigger =
  | 'on_play'      // 場に出た時
  | 'on_death'     // 死亡時
  | 'turn_start'   // ターン開始時
  | 'turn_end'     // ターン終了時
  | 'passive'      // 常時効果
  | 'on_ally_death' // 味方が死亡した時
  | 'on_damage_taken' // ダメージを受けた時
  | 'on_attack'   // 攻撃する時
  | 'on_spell_play'; // 呪文をプレイした時

/** 動的値計算の種類 */
export type DynamicValueType = 
  | 'static'           // 固定値
  | 'graveyard_creatures' // 墓地のクリーチャー数
  | 'field_allies'     // 場の味方数
  | 'field_enemies'    // 場の敵数
  | 'life_difference'  // ライフ差（自分-相手）
  | 'hand_size'        // 手札数
  | 'deck_size';       // デッキ数

/** 動的値計算設定 */
export interface DynamicValue {
  type: DynamicValueType;
  base?: number;      // 基準値（デフォルト0）
  multiplier?: number; // 乗数（デフォルト1）
  max?: number;       // 上限値
}

/** 対象フィルター */
export interface TargetFilter {
  // 既存フォーマット（後方互換性）
  property?: CardProperty;
  value?: 'spell' | 'creature' | number | Faction;
  // 新フォーマット（拡張機能）
  exclude_self?: boolean;    // 自分自身を除外
  min_health?: number;       // 最小体力
  max_health?: number;       // 最大体力
  has_keyword?: Keyword;     // 指定キーワード所持
  card_type?: CardType;      // カード種別
  min_cost?: number;         // 最小コスト
  max_cost?: number;         // 最大コスト
  has_faction?: Faction;     // 指定勢力所持（デッキサーチ用）
}

/** カード効果の対象選択（拡張版） */
export type EffectTarget = 
  | 'self'         // 自分自身
  | 'ally_all'     // 味方全体
  | 'enemy_all'    // 敵全体
  | 'ally_random'  // 味方ランダム1体
  | 'enemy_random' // 敵ランダム1体
  | 'player';      // プレイヤー直接

/** 拡張対象選択（フィルター機能付き） */
export interface EnhancedEffectTarget {
  base: EffectTarget;
  filters?: TargetFilter;
}

/** カード効果のアクション */
export type EffectAction =
  | 'damage'       // ダメージ
  | 'heal'         // 回復
  | 'buff_attack'  // 攻撃力強化
  | 'buff_health'  // 体力強化
  | 'debuff_attack'// 攻撃力弱体化
  | 'debuff_health'// 体力弱体化
  | 'summon'       // トークン召喚
  | 'draw_card'    // カードドロー
  | 'resurrect'    // 蘇生
  | 'silence'      // 沈黙
  | 'guard'       // 守護付与
  | 'stun'         // スタン（行動不能）
  | 'destroy_deck_top' // デッキトップ破壊
  | 'swap_attack_health' // 攻撃力と体力を入れ替え
  | 'hand_discard' // 手札破壊
  | 'destroy_all_creatures' // 全クリーチャー破壊
  | 'ready'        // 再攻撃準備: 攻撃済み状態を解除する
  | 'apply_brand'  // 烙印付与
  | 'banish'       // 消滅（墓地を経由しない除去）
  | 'deck_search'; // デッキサーチ

/** カード効果の条件 */
export type ConditionSubject = 'graveyard' | 'allyCount' | 'playerLife' | 'opponentLife' | 'brandedEnemyCount' | 'hasBrandedEnemy';
export type ConditionOperator = 'gte' | 'lte' | 'lt' | 'gt' | 'eq';

export interface EffectCondition {
  subject: ConditionSubject;
  operator: ConditionOperator;
  value: number | 'opponentLife';
}

/** カード効果 */
export type CardProperty = 'type' | 'cost' | 'attack' | 'health' | 'faction';

/** 特殊効果ハンドラーの型 */
export type SpecialEffectHandler = (
  state: GameState,
  effect: CardEffect,
  sourceCard: Card,
  sourcePlayerId: PlayerId,
  targets: FieldCard[],
  calculatedValue: number,
  random: { choice: <T>(array: T[]) => T | undefined; next: () => number }
) => void;

export interface CardEffect {
  /** 発動タイミング */
  trigger: EffectTrigger;
  /** 対象選択 */
  target: EffectTarget;
  /** 実行アクション */
  action: EffectAction;
  /** 効果値（ダメージ量、回復量等） */
  value: number;
  /** 発動条件（オプション） */
  condition?: EffectCondition;
  /** ターゲットを絞り込むための条件 */
  targetFilter?: TargetFilter;
  /** 動的値計算（拡張機能） */
  dynamicValue?: DynamicValue;
  /** 拡張対象選択（拡張機能） */
  enhancedTarget?: EnhancedEffectTarget;
  /** 特殊効果ハンドラー名（拡張機能） */
  specialHandler?: string;
}

/** カード種別 */
export type CardType = 'creature' | 'spell';

/** 全カード共通の基本情報 */
export interface BaseCard {
  id: string;
  name: string;
  faction: Faction;
  cost: number;
  keywords: Keyword[];
  effects: CardEffect[];
  flavor?: string;
}

/** クリーチャーカード情報 */
export interface CreatureCard extends BaseCard {
  type: 'creature';
  attack: number;
  health: number;
}

/** スペルカード情報 */
export interface SpellCard extends BaseCard {
  type: 'spell';
}

/** カード情報（クリーチャーまたはスペル） */
export type Card = CreatureCard | SpellCard;

/** 継続的な状態異常 */
export type StatusEffect = 
  | {
    type: 'poison';
    /** 効果の持続ターン数 */
    duration: number;
    /** ターンごとのダメージ量 */
    damage: number;
  }
  | {
    type: 'stun';
    /** 効果の持続ターン数 */
    duration: number;
  }
  | {
    type: 'branded';
    /** 永続効果のため持続時間なし */
  };

/** 場のクリーチャーカード（戦闘中の状態を含む） */
export interface FieldCard extends CreatureCard {
  /** カードの所有者 */
  owner: PlayerId;
  /** 現在の体力 */
  currentHealth: number;
  /** 攻撃力バフ・デバフ（永続効果） */
  attackModifier: number;
  /** 体力バフ・デバフ（永続効果） */
  healthModifier: number;
  /** パッシブ効果による攻撃力修正 */
  passiveAttackModifier: number;
  /** パッシブ効果による体力修正 */
  passiveHealthModifier: number;
  /** 召喚されたターン */
  summonTurn: number;
  /** 場での位置（左から0-4） */
  position: number;
  /** このターンに攻撃したか */
  hasAttacked: boolean;
  /** 潜伏状態か */
  isStealthed: boolean;
  /** 沈黙状態か */
  isSilenced: boolean;
  /** 状態異常リスト */
  statusEffects: StatusEffect[];
  /** このターンに再攻撃準備効果が発動したか */
  readiedThisTurn: boolean;
}

// === ゲーム状態型定義 ===

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

/** アクションデータの型定義 */

/** 値の変化を記録する汎用インターフェース */
export interface ValueChange {
  attack?: { before: number; after: number };
  health?: { before: number; after: number };
  life?: { before: number; after: number };
  energy?: { before: number; after: number };
}

export interface CardPlayActionData {
  cardId: string;
  position: number;
  initialStats?: { attack: number; health: number };
  playerEnergy?: { before: number; after: number };
}

export interface CardAttackActionData {
  attackerCardId: string;
  targetId: string; // 'player' も含む
  damage: number;
  attackerHealth?: { before: number; after: number };
  targetHealth?: { before: number; after: number };
  targetPlayerLife?: { before: number; after: number };
}

export interface CreatureDestroyedActionData {
  destroyedCardId: string;
  source: 'combat' | 'effect';
  sourceCardId?: string; // effectの場合
}

export interface EffectTriggerActionData {
  sourceCardId: string;
  effectType: EffectAction;
  effectValue: number;
  targets: Record<string, ValueChange>; // targetIdをキーとする
}

export interface PhaseChangeActionData {
  /** 変更前のフェーズ */
  fromPhase: GamePhase;
  /** 変更後のフェーズ */
  toPhase: GamePhase;
}

export interface EnergyUpdateActionData {
  maxEnergyBefore: number;
  maxEnergyAfter: number;
}

export interface TriggerEventActionData {
  triggerType: EffectTrigger;
  sourceCardId?: string;
  targetCardId?: string;
}

export interface KeywordTriggerActionData {
  keyword: Keyword;
  sourceCardId: string;
  targetId: string;
  value: number;
}

/** 戦闘アクション */
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
    };

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

// === バランス・分析用型定義 ===

/** カードの価値メトリクス */
export interface CardMetrics {
  /** 基本価値（攻撃力+体力） */
  baseValue: number;
  /** 効果価値（効果の換算値） */
  effectValue: number;
  /** コスト効率 */
  costEfficiency: number;
  /** 使用率（統計データより） */
  usageRate?: number;
  /** 勝率（統計データより） */
  winRate?: number;
}

/** デッキ構成の分析データ */
export interface DeckAnalysis {
  /** 総カード数 */
  totalCards: number;
  /** 平均エネルギーコスト */
  averageCost: number;
  /** コスト分布 */
  costDistribution: Record<number, number>;
  /** 勢力純正度（同勢力カードの割合） */
  factionPurity: number;
  /** 予想戦術タイプ */
  suggestedTactics: TacticsType;
}

// === 非同期対戦用型定義 ===

/** 対戦申請 */
export interface BattleRequest {
  /** 申請プレイヤーID */
  playerId: string;
  /** 使用デッキ */
  deck: Card[];
  /** 戦術タイプ */
  tacticsType: TacticsType;
  /** 申請時刻 */
  requestTime: number;
  /** 希望対戦相手（オプション） */
  preferredOpponent?: string;
}

/** 対戦マッチング情報 */
export interface BattleMatch {
  /** マッチID */
  matchId: string;
  /** プレイヤー1の情報 */
  player1: BattleRequest;
  /** プレイヤー2の情報 */
  player2: BattleRequest;
  /** マッチング時刻 */
  matchTime: number;
  /** 戦闘実行状態 */
  status: 'pending' | 'running' | 'completed' | 'error';
}

// === 型安全性のためのユーティリティ型 ===

/** 配列の要素型を取得 */
export type ArrayElement<T extends readonly unknown[]> = T extends readonly (infer U)[] ? U : never;

/** オプショナルなプロパティを必須に変換 */
export type Required<T> = {
  [P in keyof T]-?: T[P];
};

/** 型の厳密性チェック用 */
export type Exact<T, U> = T extends U ? (U extends T ? T : never) : never;

// === 定数の再エクスポート（後方互換性のため） ===
export {
  GAME_CONSTANTS,
  BALANCE_GUIDELINES,
  TACTICS_ATTACK_PROBABILITIES,
  FACTION_DESCRIPTIONS,
  AI_EVALUATION_WEIGHTS
} from './constants';

// === ローカル統計機能用型定義 ===

/** 勢力ごとの戦績 */
export interface FactionStats {
  games: number;
  wins: number;
}

/** ローカル統計データ */
export interface LocalStats {
  totalGames: number;
  totalWins: number;
  factionStats: Record<Faction, FactionStats>;
  lastPlayed: string; // ISO 8601 形式の日付文字列
}

// === ログ表示用拡張型定義 ===

/** ログ表示用の構造化データ */
export interface LogDisplayParts {
  type: GameAction['type'];
  iconName: string; // 'Zap', 'Swords', 'Flag' など Lucide Icon の名前
  playerName: string;
  message: string; // メインのメッセージ部分
  details?: string; // コストやダメージなどの詳細情報
  cardIds: string[]; // 関連するカードIDのリスト
  triggerText?: string; // 'プレイされた時' などのトリガー情報
}

// === デッキビルディング機能用型定義 ===

/** カスタムデッキ */
export interface CustomDeck {
  id: string; // UUID
  name: string;
  faction: Faction;
  cards: string[]; // カードIDの配列
  coreCardIds: string[]; // コアカードのID配列
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/** 保存されるデッキコレクション */
export interface DeckCollection {
  decks: CustomDeck[];
  activeDeckIds: Partial<Record<Faction, string>>; // 各勢力で選択中のデッキID
}
