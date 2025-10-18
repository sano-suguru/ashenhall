import type { CardEffect, EffectAction, EffectCondition, ConditionSubject, ConditionOperator } from '@/types/game';

/**
 * 動的効果値を持つカードの専用テキスト定義
 * カードIDをキーとして、そのカードの正しい効果テキストを定義
 */
const DYNAMIC_EFFECT_TEXTS: Record<string, string> = {
  // 味方クリーチャー数依存
  'kni_sanctuary_prayer': '使用時: 味方全体を味方クリーチャー数分回復する。',
  
  // 墓地枚数依存
  'necro_soul_vortex': '使用時: 墓地の枚数分だけ1/1の骸骨トークンを召喚する。',
  'necro_grave_giant': '召喚時: 墓地のクリーチャー数分、自身の攻撃力を+Xする。',
  
  // 烙印持ち敵数依存
  'inq_collective_confession': '使用時: 相手プレイヤーを2+烙印を持つ敵の数分回復する。',
  
  // 他の味方数依存（パッシブ効果）
  'kni_galleon': '常時: 他の味方クリーチャー数分、自身の攻撃力を+Xする。',
};

/**
 * 特別な効果テキストを取得
 */
function getSpecialEffectText(cardId: string): string | null {
  if (DYNAMIC_EFFECT_TEXTS[cardId]) {
    return DYNAMIC_EFFECT_TEXTS[cardId];
  }
  return null;
}

/**
 * プロパティルール値の型ガード関数
 */
function isPropertyRuleValue(value: unknown): value is { property: string; expectedValue: unknown } {
  return typeof value === 'object' && value !== null && 'property' in value;
}

/**
 * 烙印関連ルールのフォーマット処理
 */
function formatBrandRule(rule: import('@/types/cards').FilterRule): string | null {
  if (rule.type !== 'brand') return null;
  
  switch (rule.operator) {
    case 'has': return '烙印を刻まれた';
    case 'not_has': return '烙印を刻まれていない';
    default: return null;
  }
}

/**
 * プロパティ関連ルールのフォーマット処理
 */
function formatPropertyRule(rule: import('@/types/cards').FilterRule): string | null {
  if (rule.type !== 'property') return null;
  if (!isPropertyRuleValue(rule.value)) return null;
  
  const propRule = rule.value;
  if (propRule.property === 'type') {
    return `${propRule.expectedValue}タイプの`;
  }
  return null;
}

/**
 * コスト関連ルールのフォーマット処理
 */
function formatCostRule(rule: import('@/types/cards').FilterRule): string | null {
  if (rule.type !== 'cost') return null;
  if (rule.operator === 'range' && rule.maxValue !== undefined) {
    return `コスト${rule.maxValue}以下の`;
  }
  return null;
}

/**
 * カードタイプ関連ルールのフォーマット処理
 */
function formatCardTypeRule(rule: import('@/types/cards').FilterRule): string | null {
  return rule.type === 'card_type' ? `${rule.value}タイプの` : null;
}

/**
 * 勢力関連ルールのフォーマット処理
 */
function formatFactionRule(rule: import('@/types/cards').FilterRule): string | null {
  return rule.type === 'faction' ? `${rule.value}勢力の` : null;
}

/**
 * FilterRule[]を日本語テキストに変換（新インターフェース）
 */
const getSelectionRulesText = (rules?: import('@/types/cards').FilterRule[]): string => {
  if (!rules || rules.length === 0) return '';
  
  const formatters = [
    formatBrandRule,
    formatPropertyRule, 
    formatCostRule,
    formatCardTypeRule,
    formatFactionRule
  ];
  
  const filters: string[] = [];
  
  rules.forEach(rule => {
    for (const formatter of formatters) {
      const result = formatter(rule);
      if (result) {
        filters.push(result);
        break;
      }
    }
  });
  
  return filters.join('');
};


const getTargetText = (target: CardEffect['target']): string => {
  const targetMap: { [key: string]: string } = {
    self: '自身',
    ally_all: '味方全体',
    enemy_all: '敵全体',
    ally_random: 'ランダムな味方1体',
    enemy_random: 'ランダムな敵1体',
    player: '相手プレイヤー',
  };
  return targetMap[target] || '';
};

const actionTextGenerator: Record<EffectAction, (effect: CardEffect) => string> = {
  damage: (e) => {
    const filterText = getSelectionRulesText(e.selectionRules);
    return `${filterText}${getTargetText(e.target)}に${e.value}ダメージを与える。`;
  },
  heal: (e) => {
    const filterText = getSelectionRulesText(e.selectionRules);
    return `${filterText}${getTargetText(e.target)}を${e.value}回復する。`;
  },
  buff_attack: (e) => {
    const filterText = getSelectionRulesText(e.selectionRules);
    return `${filterText}${getTargetText(e.target)}の攻撃力を+${e.value}する。`;
  },
  buff_health: (e) => {
    const filterText = getSelectionRulesText(e.selectionRules);
    return `${filterText}${getTargetText(e.target)}の体力を+${e.value}する。`;
  },
  debuff_attack: (e) => {
    const filterText = getSelectionRulesText(e.selectionRules);
    return `${filterText}${getTargetText(e.target)}の攻撃力を-${e.value}する。`;
  },
  debuff_health: (e) => {
    const filterText = getSelectionRulesText(e.selectionRules);
    return `${filterText}${getTargetText(e.target)}の体力を-${e.value}する。`;
  },
  summon: (e) => `1/1の骸骨トークンを${e.value}体召喚する。`,
  draw_card: (e) => `カードを${e.value}枚引く。`,
  resurrect: (e) => `あなたの墓地からコスト${e.value}以下のクリーチャーを1体戦場に戻す。`,
  silence: (e) => {
    const filterText = getSelectionRulesText(e.selectionRules);
    return `${filterText}${getTargetText(e.target)}を沈黙させる。`;
  },
  stun: (e) => {
    const filterText = getSelectionRulesText(e.selectionRules);
    return `${filterText}${getTargetText(e.target)}は、次のターン攻撃できない。`;
  },
  destroy_deck_top: (e) => `相手はデッキの上から${e.value}枚のカードを墓地に置く。`,
  swap_attack_health: (e) => {
    const filterText = getSelectionRulesText(e.selectionRules);
    return `${filterText}${getTargetText(e.target)}の攻撃力と体力を入れ替える。`;
  },
  hand_discard: (e) => `相手は手札からランダムに${e.value}枚のカードを捨てる。`,
  ready: () => `このターン、もう一度だけ攻撃できる。`,
  guard: (e) => {
    const filterText = getSelectionRulesText(e.selectionRules);
    return `${filterText}${getTargetText(e.target)}に守護を付与する。`;
  },
  destroy_all_creatures: () => '全てのクリーチャーを破壊する。',
  apply_brand: (e) => {
    const filterText = getSelectionRulesText(e.selectionRules);
    return `${filterText}${getTargetText(e.target)}に烙印を刻む。`;
  },
  banish: (e) => {
    const filterText = getSelectionRulesText(e.selectionRules);
    return `${filterText}${getTargetText(e.target)}を消滅させる。`;
  },
  deck_search: () => `デッキから条件に合うカードを1枚手札に加える。`,
};

/**
 * 烙印関連の特殊ケース処理
 */
const formatBrandedEnemyCondition = (condition: EffectCondition): string | null => {
  if (condition.subject !== 'hasBrandedEnemy' || condition.operator !== 'eq') {
    return null;
  }
  return condition.value === 1 
    ? '烙印を刻まれた敵がいる場合、'
    : '烙印を刻まれた敵がいない場合、';
};

/**
 * プレイヤーライフ比較の特殊ケース処理
 */
const formatLifeComparisonCondition = (condition: EffectCondition): string | null => {
  if (condition.subject !== 'playerLife' || condition.value !== 'opponentLife') {
    return null;
  }
  
  const comparisonMap: Record<ConditionOperator, string> = {
    lt: '相手よりライフが少ない場合、',
    gt: '相手よりライフが多い場合、', 
    eq: '相手とライフが同じ場合、',
    gte: '相手以上のライフの場合、',
    lte: '相手以下のライフの場合、',
  };
  
  return comparisonMap[condition.operator] || null;
};

/**
 * 通常の数値比較処理
 */
const formatNumericCondition = (condition: EffectCondition): string => {
  const subjectMap: Record<ConditionSubject, string> = {
    graveyard: '墓地のカード数',
    allyCount: '味方クリーチャー数',
    playerLife: 'あなたのライフ',
    opponentLife: '相手のライフ',
    brandedEnemyCount: '烙印を刻まれた敵の数',
    hasBrandedEnemy: '烙印を刻まれた敵',
    enemyCreatureCount: '敵クリーチャー数',
  };

  const operatorMap: Record<ConditionOperator, string> = {
    gte: '以上',
    lte: '以下',
    lt: '未満',
    gt: 'より多い',
    eq: 'である',
  };

  const subjectText = subjectMap[condition.subject] || condition.subject;
  const operatorText = operatorMap[condition.operator] || condition.operator;
  const valueText = typeof condition.value === 'number' 
    ? condition.value.toString()
    : '相手のライフ';

  return `${subjectText}が${valueText}${operatorText}の場合、`;
};

/**
 * 効果の発動条件をテキストに変換
 */
const getConditionText = (condition: EffectCondition): string => {
  // 特殊ケース1: hasBrandedEnemy処理
  const brandedResult = formatBrandedEnemyCondition(condition);
  if (brandedResult) return brandedResult;
  
  // 特殊ケース2: ライフ比較処理  
  const lifeComparisonResult = formatLifeComparisonCondition(condition);
  if (lifeComparisonResult) return lifeComparisonResult;
  
  // 標準ケース: 数値比較処理
  return formatNumericCondition(condition);
};

export const getEffectText = (
  effect: CardEffect, 
  cardType: 'creature' | 'spell',
  cardId?: string
): string => {
  // 特別な効果テキストがある場合はそれを優先
  const specialText = getSpecialEffectText(cardId || '');
  if (specialText) {
    return specialText;
  }

  const triggerMap: { [key: string]: string } = {
    on_play: cardType === 'creature' ? '召喚時' : '使用時',
    on_death: '死亡時',
    turn_start: 'ターン開始時',
    turn_end: 'ターン終了時',
    passive: '常時',
    on_spell_play: 'あなたが呪文を使用した後',
    on_ally_death: '味方のクリーチャーが死亡するたび',
    on_damage_taken: 'このクリーチャーがダメージを受けた時',
    on_attack: 'このクリーチャーが攻撃する時',
  };

  const triggerText = triggerMap[effect.trigger] || `[未定義トリガー: ${effect.trigger}]`;

  const generator = actionTextGenerator[effect.action];
  const effectDescription = generator
    ? generator(effect)
    : `[未定義アクション: ${effect.action}]`;

  // 効果発動条件がある場合は条件テキストを追加
  const activationCondition = effect.activationCondition;
  if (activationCondition) {
    const conditionText = getConditionText(activationCondition);
    return `${conditionText}${triggerText}: ${effectDescription}`;
  }

  return `${triggerText}: ${effectDescription}`;
};

export const KEYWORD_DEFINITIONS: Record<string, { name: string; description: string }> = {
  guard: { name: '守護', description: 'このクリーチャーがいる限り、他の味方は攻撃されない' },
  lifesteal: { name: '生命奪取', description: '与えたダメージ分プレイヤーを回復' },
  stealth: { name: '潜伏', description: '1ターンの間、対象にならない' },
  poison: { name: '毒', description: 'ダメージを与えた敵に継続ダメージを与える' },
  retaliate: { name: '反撃', description: '攻撃された時に半分のダメージで反撃する' },
  echo: { name: '残響', description: 'あなたの墓地にあるカード枚数を参照する' },
  formation: { name: '連携', description: 'あなたの場にいる味方クリーチャーの数を参照する' },
  rush: { name: '速攻', description: '召喚されたターンに攻撃できる' },
  trample: { name: '貫通', description: 'ブロックしたクリーチャーの体力を超えたダメージを敵プレイヤーに与える' },
  untargetable: { name: '対象不可', description: '相手のスペルや効果の対象にならない' },
};
