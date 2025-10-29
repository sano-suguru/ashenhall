/**
 * Ashenhall ゲーム定数定義
 *
 * 設計方針:
 * - ゲームバランスの基準となる数値
 * - AI戦術計算に使用される重み
 * - 勢力の特色を表現する説明文
 */

import type { Faction } from './game';

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
  // 勢力別ボーナス
  FACTION_BONUSES: {
    NECROMANCER: { ECHO_PER_GRAVEYARD: 3, ON_DEATH: 5 },
    KNIGHT: { FORMATION_PER_ALLY: 4, GUARD: 6 },
    BERSERKER: { PER_LIFE_DEFICIT: 1.5, HIGH_ATTACK: 2 },
    MAGE: {
      SPELL_PLAY: 15,
      ON_SPELL_PLAY_TRIGGER: 10,
      HAND_ADVANTAGE: 2, // 手札アドバンテージボーナス
      CARD_DRAW_VALUE: 8, // カードドロー効果価値
      SPELL_SYNERGY: 5, // on_spell_playクリーチャー存在時のスペルボーナス
      AOE_TARGET_RICH: 4, // 敵が多い時の範囲攻撃ボーナス
    },
    INQUISITOR: {
      DEBUFF_PER_ENEMY: 3,
      SILENCE_STUN: 5, // 8 → 5: 妨害スペルの過剰評価を是正
      BRAND_SYNERGY_PER_TARGET: 3.0, // 烙印シナジーボーナス
      BRAND_APPLICATION: 6, // 烙印付与カードのボーナス
    },
  },
} as const;
