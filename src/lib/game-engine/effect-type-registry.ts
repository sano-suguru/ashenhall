/**
 * 拡張可能型システム - 新要素追加時の修正箇所削減
 * 
 * 設計方針:
 * - EffectAction、Keyword等の新要素追加を容易にする
 * - 修正箇所の中央集約化
 * - 個人開発での保守負荷軽減
 */

import type { EffectAction, Keyword } from '@/types/effects';

/**
 * EffectAction拡張管理
 * 新効果アクション追加時の一元管理
 */
export class EffectActionRegistry {
  // 全EffectActionの中央集約リスト
  static readonly ALL_ACTIONS: readonly EffectAction[] = [
    'damage', 'heal', 'buff_attack', 'buff_health', 'debuff_attack', 'debuff_health',
    'summon', 'draw_card', 'silence', 'resurrect', 'guard', 'stun', 'ready',
    'destroy_deck_top', 'swap_attack_health', 'hand_discard', 'destroy_all_creatures',
    'apply_brand', 'banish', 'deck_search'
  ] as const;

  /**
   * 効果アクション表示名マッピング（多言語対応準備）
   */
  static readonly DISPLAY_NAMES: Record<EffectAction, string> = {
    damage: 'ダメージ',
    heal: '回復',
    buff_attack: '攻撃力上昇',
    buff_health: '体力上昇',
    debuff_attack: '攻撃力減少',
    debuff_health: '体力減少',
    summon: '召喚',
    draw_card: 'カードドロー',
    silence: '沈黙',
    resurrect: '蘇生',
    guard: '守護付与',
    stun: '気絶',
    ready: '再攻撃準備',
    destroy_deck_top: 'デッキ破壊',
    swap_attack_health: '攻守交替',
    hand_discard: '手札破棄',
    destroy_all_creatures: '全体破壊',
    apply_brand: '烙印付与',
    banish: '消滅',
    deck_search: 'デッキ検索',
  };

  /**
   * 効果アクションの分類（Phase 2統計機能用）
   */
  static readonly CATEGORIES: Record<EffectAction, 'offense' | 'defense' | 'utility' | 'control'> = {
    damage: 'offense',
    heal: 'defense',
    buff_attack: 'offense',
    buff_health: 'defense',
    debuff_attack: 'control',
    debuff_health: 'control',
    summon: 'utility',
    draw_card: 'utility',
    silence: 'control',
    resurrect: 'utility',
    guard: 'defense',
    stun: 'control',
    ready: 'utility',
    destroy_deck_top: 'control',
    swap_attack_health: 'utility',
    hand_discard: 'control',
    destroy_all_creatures: 'offense',
    apply_brand: 'control',
    banish: 'control',
    deck_search: 'utility',
  };

  /**
   * 新EffectAction追加時の検証ヘルパー
   */
  static validateNewAction(action: string): action is EffectAction {
    return this.ALL_ACTIONS.includes(action as EffectAction);
  }
}

/**
 * Keyword拡張管理
 * 新キーワード追加時の一元管理
 */
export class KeywordRegistry {
  // 全Keywordの中央集約リスト
  static readonly ALL_KEYWORDS: readonly Keyword[] = [
    'guard', 'lifesteal', 'trample', 'rush', 'stealth', 'untargetable', 
    'poison', 'retaliate', 'echo', 'formation'
  ] as const;

  /**
   * キーワード表示名マッピング
   */
  static readonly DISPLAY_NAMES: Record<Keyword, string> = {
    guard: '守護',
    lifesteal: '吸血',
    trample: '踏破',
    rush: '突撃',
    stealth: '潜伏',
    untargetable: '対象不可',
    poison: '毒',
    retaliate: '報復',
    echo: '反響',
    formation: '陣形',
  };

  /**
   * キーワードの説明文
   */
  static readonly DESCRIPTIONS: Record<Keyword, string> = {
    guard: 'このクリーチャーがいる限り、他の味方は攻撃されない',
    lifesteal: '与えたダメージ分、自分のライフを回復',
    trample: '余剰ダメージをプレイヤーに与える',
    rush: '召喚したターンから攻撃できる',
    stealth: '攻撃するまで対象にできない',
    untargetable: '効果の対象にできない',
    poison: 'ターン終了時、毒を持つクリーチャーは1ダメージを受ける',
    retaliate: 'ダメージを受けた時、攻撃してきた相手に同じダメージを与える',
    echo: '墓地枚数に応じて効果が変化',
    formation: '味方の数に応じて効果が変化',
  };

  /**
   * 新Keyword追加時の検証ヘルパー
   */
  static validateNewKeyword(keyword: string): keyword is Keyword {
    return this.ALL_KEYWORDS.includes(keyword as Keyword);
  }
}

/**
 * 型拡張ヘルパー関数群
 * 新要素追加時の自動検証とサポート
 */
export class TypeExtensionHelper {
  /**
   * 型定義の整合性チェック（開発時デバッグ用）
   */
  static validateTypeConsistency(): boolean {
    // EffectActionの整合性チェック
    const effectActionsValid = EffectActionRegistry.ALL_ACTIONS.every(action => 
      action in EffectActionRegistry.DISPLAY_NAMES &&
      action in EffectActionRegistry.CATEGORIES
    );

    // Keywordの整合性チェック
    const keywordsValid = KeywordRegistry.ALL_KEYWORDS.every(keyword => 
      keyword in KeywordRegistry.DISPLAY_NAMES &&
      keyword in KeywordRegistry.DESCRIPTIONS
    );

    return effectActionsValid && keywordsValid;
  }

  /**
   * 新要素追加時のチェックリスト生成
   */
  static generateExtensionChecklist(type: 'EffectAction' | 'Keyword', newElement: string): string[] {
    const checklist: string[] = [];

    if (type === 'EffectAction') {
      checklist.push(
        `1. types/effects.ts の EffectAction に '${newElement}' を追加`,
        `2. extensible-types.ts の ALL_ACTIONS に追加`,
        `3. DISPLAY_NAMES に日本語名を追加`,
        `4. CATEGORIES に分類を追加`,
        `5. effect-registry.ts の effectHandlers に実装を追加`,
        `6. テストケースの作成`
      );
    } else if (type === 'Keyword') {
      checklist.push(
        `1. types/effects.ts の Keyword に '${newElement}' を追加`,
        `2. extensible-types.ts の ALL_KEYWORDS に追加`,
        `3. DISPLAY_NAMES に日本語名を追加`, 
        `4. DESCRIPTIONS に説明を追加`,
        `5. battle-system.ts に処理ロジック追加`,
        `6. テストケースの作成`
      );
    }

    return checklist;
  }
}
