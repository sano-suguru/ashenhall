/**
 * Ashenhall カード効果システム型定義
 * 
 * 設計方針:
 * - カード効果・キーワード・状態異常の型定義
 * - 効果の発動条件・対象選択の型定義
 * - 動的値計算システムの型定義
 */


// === キーワード能力 ===

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

// === 効果発動システム ===

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

/** カード効果の対象選択（拡張版） */
export type EffectTarget = 
  | 'self'         // 自分自身
  | 'ally_all'     // 味方全体
  | 'enemy_all'    // 敵全体
  | 'ally_random'  // 味方ランダム1体
  | 'enemy_random' // 敵ランダム1体
  | 'player'       // 相手プレイヤー直接
  | 'self_player'; // 自分のプレイヤー直接


// === 効果発動条件システム ===

/** カード効果の条件 */
export type ConditionSubject = 'graveyard' | 'allyCount' | 'playerLife' | 'opponentLife' | 'brandedEnemyCount' | 'hasBrandedEnemy';

/** 条件演算子 */
export type ConditionOperator = 'gte' | 'lte' | 'lt' | 'gt' | 'eq';

// === 継続的状態異常 ===

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
