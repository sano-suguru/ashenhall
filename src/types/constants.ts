/**
 * Ashenhall ゲーム定数定義
 * 
 * 設計方針:
 * - ゲームバランスの基準となる数値
 * - AI戦術計算に使用される重み
 * - 勢力の特色を表現する説明文
 */

import type { Faction, TacticsType } from './game';

// === ゲーム定数 ===

/** ゲームルール定数 */
export const GAME_CONSTANTS = {
  /** デッキサイズ */
  DECK_SIZE: 20,
  /** 初期ライフ */
  INITIAL_LIFE: 15,
  /** 初期手札数 */
  INITIAL_HAND_SIZE: 3,
  /** 初期エネルギー */
  INITIAL_ENERGY: 0,
  /** 初期最大エネルギー */
  INITIAL_MAX_ENERGY: 0,
  /** 手札上限 */
  HAND_LIMIT: 7,
  /** 場の上限 */
  FIELD_LIMIT: 5,
  /** エネルギー上限 */
  ENERGY_LIMIT: 8,
  /** 同名カード制限 */
  CARD_COPY_LIMIT: 2,
  /** 戦闘計算制限時間（秒） */
  BATTLE_TIME_LIMIT: 5,
} as const;

/**
 * エネルギーレシオ基準（バランス調整指針）
 * 
 * 基本ステータス標準値:
 * - 1コスト: 攻撃力 + 体力 = 2.5
 * - 2コスト: 攻撃力 + 体力 = 4.5  
 * - 3コスト: 攻撃力 + 体力 = 6.5
 * 
 * 効果価値の換算基準:
 * - 軽微な効果: 0.5ステータス相当（1ダメージ、1回復、1ドロー等）
 * - 中程度効果: 1.0ステータス相当（2ダメージ、全体1ダメージ、1バフ等）
 * - 重大効果: 1.5ステータス相当（3ダメージ、全体バフ、召喚等）
 * 
 * 調整方針:
 * - カード総合価値 = 基本ステータス + 効果価値 ≈ コストに対応する標準値
 * - 0.5刻みでの微調整により、段階的なバランス改善を実現
 * - 勢力間の特色は効果の種類で差別化、パワーレベルは均等化
 */
export const BALANCE_GUIDELINES = {
  /** コスト別基本ステータス標準値 */
  STANDARD_STATS: {
    1: 2.5,
    2: 4.5, 
    3: 6.5,
  },
  /** 効果価値換算表 */
  EFFECT_VALUES: {
    MINOR: 0.5,   // 軽微な効果
    MODERATE: 1.0, // 中程度効果  
    MAJOR: 1.5,   // 重大効果
  },
} as const;

/** 戦術別攻撃確率（プレイヤーへの直接攻撃確率）*/
export const TACTICS_ATTACK_PROBABILITIES: Record<TacticsType, number> = {
  aggressive: 0.6,  // 60% - 積極的にプレイヤーを狙う
  defensive: 0.2,   // 20% - 守護重視、クリーチャー優先
  balanced: 0.4,    // 40% - バランス型
  tempo: 0.5,       // 50% - 中庸
} as const;

/** 勢力の特色説明 */
export const FACTION_DESCRIPTIONS: Record<Faction, string> = {
  necromancer: '死こそが真の始まり。戦場の屍を糧とし、死者の軍勢で敵を圧倒する暗黒の軍団',
  berserker: '栄光ある死こそが生の証明。命を燃やし尽くし、一撃に全てを賭ける血の戦術',
  mage: '知識こそが究極の力。古代の叡智と元素の力で戦場を支配する神秘の継承者',
  knight: '義と絆が闇を払う。仲間への信頼と聖なる力で困難を乗り越える光の騎士',
  inquisitor: '秩序なき世に裁きを。敵の力を削ぎ、完膚なきまでに制圧する鉄の規律',
} as const;

/** AIのカード評価係数 */
export const AI_EVALUATION_WEIGHTS = {
  // 基本スコア計算用
  BASE_SCORE: {
    SPELL_COST_MULTIPLIER: 1.5,
  },
  // 戦術別モディファイア
  TACTICS_MODIFIERS: {
    AGGRESSIVE: { ATTACK: 2, HEALTH: 1 },
    DEFENSIVE: { ATTACK: 1, HEALTH: 2 },
    TEMPO: { EFFICIENCY: 3, COST_PENALTY: 2 },
  },
  // 勢力別ボーナス
  FACTION_BONUSES: {
    NECROMANCER: { ECHO_PER_GRAVEYARD: 3, ON_DEATH: 5 },
    KNIGHT: { FORMATION_PER_ALLY: 4, GUARD: 6 },
    BERSERKER: { PER_LIFE_DEFICIT: 1.5, HIGH_ATTACK: 2 },
    MAGE: { 
      SPELL_PLAY: 15, 
      ON_SPELL_PLAY_TRIGGER: 10,
      HAND_ADVANTAGE: 2,      // 手札アドバンテージボーナス
      CARD_DRAW_VALUE: 8,     // カードドロー効果価値
      SPELL_SYNERGY: 5,       // on_spell_playクリーチャー存在時のスペルボーナス
      AOE_TARGET_RICH: 4      // 敵が多い時の範囲攻撃ボーナス
    },
    INQUISITOR: { DEBUFF_PER_ENEMY: 3, SILENCE_STUN: 8 },
  },
} as const;
