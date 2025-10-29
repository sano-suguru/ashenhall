/**
 * Ashenhall AI 戦術エンジン
 *
 * 設計方針:
 * - 勢力ごとの特色ある戦術を実装
 * - 盤面全体を評価した最適な行動選択
 * - テスト容易な純粋関数として実装
 */

import type { GameState, Card, FieldCard, PlayerId, Faction } from '@/types/game';
import { GAME_CONSTANTS, AI_EVALUATION_WEIGHTS } from '@/types/game';
import { SeededRandom } from './seeded-random';
import { hasBrandedStatus } from './brand-utils';

const { BASE_SCORE, FACTION_BONUSES } = AI_EVALUATION_WEIGHTS;

// NOTE:以降の関数はテストのためにエクスポートされています
export const calculateBaseScore = (card: Card): number => {
  if (card.type === 'spell') {
    return card.cost * BASE_SCORE.SPELL_COST_MULTIPLIER;
  }
  // balanced戦術相当のロジックに統一
  return (card.attack + card.health) / Math.max(card.cost, 1);
};

// --- 勢力別ボーナス計算 ---
const getNecromancerBonus = (card: Card, player: GameState['players'][PlayerId]) => {
  let bonus = 0;
  const graveCardCount = player.graveyard.length;

  if (card.keywords.includes('echo')) {
    bonus += graveCardCount * FACTION_BONUSES.NECROMANCER.ECHO_PER_GRAVEYARD;
  }
  if (card.effects.some((e) => e.trigger === 'on_death')) {
    bonus += FACTION_BONUSES.NECROMANCER.ON_DEATH;
  }

  // 墓地が空なら蘇生系カードに大幅ペナルティ（無駄撃ち防止）
  if (graveCardCount === 0) {
    const hasResurrectEffect = card.effects.some(
      (e) => e.action === 'resurrect' || (e.trigger === 'on_death' && e.target === 'self')
    );
    if (hasResurrectEffect) {
      bonus -= 10; // 無駄撃ち防止
    }
  }

  return bonus;
};

const getKnightBonus = (card: Card, player: GameState['players'][PlayerId]) => {
  let bonus = 0;
  if (card.keywords.includes('formation'))
    bonus += player.field.length * FACTION_BONUSES.KNIGHT.FORMATION_PER_ALLY;
  if (card.keywords.includes('guard')) bonus += FACTION_BONUSES.KNIGHT.GUARD;
  return bonus;
};

const getBerserkerBonus = (card: Card, player: GameState['players'][PlayerId]) => {
  let bonus = 0;
  const lifeDeficit = GAME_CONSTANTS.INITIAL_LIFE - player.life;
  if (lifeDeficit > 0) bonus += lifeDeficit * FACTION_BONUSES.BERSERKER.PER_LIFE_DEFICIT;
  if (card.type === 'creature' && card.attack > card.health)
    bonus += card.attack * FACTION_BONUSES.BERSERKER.HIGH_ATTACK;
  return bonus;
};

const getMageBonus = (
  card: Card,
  player: GameState['players'][PlayerId],
  opponent: GameState['players'][PlayerId]
) => {
  let bonus = 0;

  // 基本スペルボーナス
  if (card.type === 'spell') bonus += FACTION_BONUSES.MAGE.SPELL_PLAY;
  if (card.effects.some((e) => e.trigger === 'on_spell_play'))
    bonus += FACTION_BONUSES.MAGE.ON_SPELL_PLAY_TRIGGER;

  // 「叡智」系ボーナス: 手札アドバンテージを重視
  const handAdvantage = player.hand.length - opponent.hand.length;
  if (handAdvantage > 0 && card.type === 'spell') {
    bonus += handAdvantage * FACTION_BONUSES.MAGE.HAND_ADVANTAGE;
  }

  // 「知識」系ボーナス: カードドロー効果の価値向上
  if (card.effects.some((e) => e.action === 'draw_card')) {
    bonus += FACTION_BONUSES.MAGE.CARD_DRAW_VALUE;
  }

  // 「戦場制御」系ボーナス: スペル相互作用の評価
  const spellSynergyCreatures = player.field.filter((c) =>
    c.effects.some((e) => e.trigger === 'on_spell_play')
  );
  if (card.type === 'spell' && spellSynergyCreatures.length > 0) {
    bonus += spellSynergyCreatures.length * FACTION_BONUSES.MAGE.SPELL_SYNERGY;
  }

  // 「元素の力」系ボーナス: 範囲攻撃の戦術的価値
  const hasAoeEffect = card.effects.some(
    (e) => e.target === 'enemy_all' && (e.action === 'damage' || e.action.includes('debuff'))
  );
  if (hasAoeEffect && opponent.field.length >= 2) {
    bonus += opponent.field.length * FACTION_BONUSES.MAGE.AOE_TARGET_RICH;
  }

  return bonus;
};

const getInquisitorBonus = (
  card: Card,
  _player: GameState['players'][PlayerId],
  opponent: GameState['players'][PlayerId]
) => {
  let bonus = 0;

  const brandedEnemies = opponent.field.filter(hasBrandedStatus);
  const brandedCount = brandedEnemies.length;
  const unbrandedCount = opponent.field.length - brandedCount;

  // 新規：烙印付与カードの動的評価
  const hasBrandEffect = card.effects.some((e) => e.action === 'apply_brand');
  if (hasBrandEffect) {
    if (unbrandedCount >= 2 && brandedCount === 0) {
      // 敵が複数いて、烙印がない → 最優先
      bonus += FACTION_BONUSES.INQUISITOR.BRAND_APPLICATION;
    } else if (unbrandedCount >= 1) {
      // まだ烙印を付けるべき敵がいる → 高評価
      bonus += FACTION_BONUSES.INQUISITOR.BRAND_APPLICATION * 0.7;
    } else if (opponent.field.length > 0) {
      // 全員に烙印済み → ペナルティ
      bonus -= 5;
    }
  }

  // 既存のボーナス
  if (card.effects.some((e) => e.action.includes('debuff') || e.action.includes('destroy'))) {
    bonus += opponent.field.length * FACTION_BONUSES.INQUISITOR.DEBUFF_PER_ENEMY;
  }
  if (card.effects.some((e) => e.action === 'silence' || e.action === 'stun')) {
    bonus += FACTION_BONUSES.INQUISITOR.SILENCE_STUN;
  }

  // 烙印シナジーボーナス
  if (brandedCount > 0) {
    // 烙印対象を条件とする効果
    const hasBrandCondition = card.effects.some(
      (e) =>
        e.selectionRules?.some((r) => r.type === 'brand') ||
        e.activationCondition?.subject === 'hasBrandedEnemy'
    );
    if (hasBrandCondition) {
      bonus += brandedCount * FACTION_BONUSES.INQUISITOR.BRAND_SYNERGY_PER_TARGET;
    }
  }

  return bonus;
};

type FactionScorer = (
  card: Card,
  player: GameState['players'][PlayerId],
  opponent: GameState['players'][PlayerId]
) => number;

const factionScorers: Record<Faction, FactionScorer> = {
  necromancer: getNecromancerBonus,
  knight: getKnightBonus,
  berserker: getBerserkerBonus,
  mage: getMageBonus,
  inquisitor: getInquisitorBonus,
};

export const calculateFactionBonus = (
  card: Card,
  gameState: GameState,
  playerId: PlayerId
): number => {
  const player = gameState.players[playerId];
  const opponent = gameState.players[playerId === 'player1' ? 'player2' : 'player1'];
  const scorer = factionScorers[player.faction];
  return scorer ? scorer(card, player, opponent) : 0;
};

/**
 * カード配置の評価スコアを計算
 */
function evaluateCardScore(card: Card, gameState: GameState, playerId: PlayerId): number {
  const baseScore = calculateBaseScore(card);
  const factionBonus = calculateFactionBonus(card, gameState, playerId);
  return baseScore + factionBonus;
}

/**
 * 味方フィールドから有効な対象を抽出
 */
function findValidAllies(sourcePlayer: GameState['players'][PlayerId]): FieldCard[] {
  return sourcePlayer.field.filter((ally) => ally.currentHealth > 0);
}

/**
 * 敵フィールドから有効な対象を抽出（untargetable除外）
 */
function findValidEnemies(opponent: GameState['players'][PlayerId]): FieldCard[] {
  return opponent.field.filter(
    (enemy) => enemy.currentHealth > 0 && !enemy.keywords.includes('untargetable')
  );
}

/**
 * 単一効果が有効な対象を持つかチェック
 */
function hasValidTargetsForEffect(
  effect: Card['effects'][0],
  sourcePlayer: GameState['players'][PlayerId],
  opponent: GameState['players'][PlayerId]
): boolean {
  switch (effect.target) {
    case 'self':
    case 'player':
      // 自分自身またはプレイヤー対象は常に有効
      return true;

    case 'ally_all':
    case 'ally_random':
      // 味方に有効な対象がいるかチェック
      return findValidAllies(sourcePlayer).length > 0;

    case 'enemy_all':
    case 'enemy_random':
      // 敵に有効な対象がいるかチェック
      return findValidEnemies(opponent).length > 0;

    default:
      // 不明な対象タイプは有効とみなす
      return true;
  }
}

/**
 * カード効果が有効な対象を見つけられるかチェック
 */
export function canEffectFindValidTargets(
  card: Card,
  gameState: GameState,
  playerId: PlayerId
): boolean {
  // クリーチャーカードは常に配置可能
  if (card.type === 'creature') {
    return true;
  }

  // 効果を持たないスペルは常にプレイ可能
  if (card.effects.length === 0) {
    return true;
  }

  const sourcePlayer = gameState.players[playerId];
  const opponentId: PlayerId = playerId === 'player1' ? 'player2' : 'player1';
  const opponent = gameState.players[opponentId];

  // 各効果について対象の存在をチェック
  for (const effect of card.effects) {
    if (!hasValidTargetsForEffect(effect, sourcePlayer, opponent)) {
      return false;
    }
  }

  return true;
}

/**
 * カード配置の評価（無駄撃ち防止版）
 */
export function evaluateCardForPlay(card: Card, gameState: GameState, playerId: PlayerId): number {
  // 無駄撃ち防止: 対象が存在しない場合は大幅ペナルティ
  if (!canEffectFindValidTargets(card, gameState, playerId)) {
    return -1000; // 大幅なペナルティを適用
  }

  return evaluateCardScore(card, gameState, playerId);
}

/**
 * 守護持ちのターゲットを選択
 */
function selectGuardTarget(potentialTargets: FieldCard[], random: SeededRandom): FieldCard | null {
  const guardCreatures = potentialTargets.filter(
    (c) => c.keywords.includes('guard') && !c.isSilenced
  );
  return guardCreatures.length > 0 ? random.choice(guardCreatures) || null : null;
}

/**
 * 勢力別の優先ターゲットフィルタ
 */
const FACTION_PRIORITY_FILTERS: Record<Faction, (target: FieldCard) => boolean> = {
  inquisitor: hasBrandedStatus,
  necromancer: (target) => target.effects.some((e) => e.trigger === 'on_death'),
  berserker: () => false,
  knight: () => false,
  mage: () => false,
};

/**
 * 勢力別の優先ターゲットを選択
 */
function selectFactionPriorityTarget(
  faction: Faction,
  potentialTargets: FieldCard[]
): FieldCard | null {
  const filter = FACTION_PRIORITY_FILTERS[faction];
  const priorityTargets = potentialTargets.filter(filter);
  return priorityTargets.length > 0 ? priorityTargets[0] : null;
}

/**
 * プレイヤー攻撃確率を計算
 */
function calculatePlayerAttackProbability(faction: Faction, lifeRatio: number): number {
  // 戦狂い：低ライフ時はプレイヤー攻撃を優先（勢力の個性として保持）
  if (faction === 'berserker' && lifeRatio < 0.4) {
    return 0.8;
  }
  // balanced戦術相当の固定値（40%）
  return 0.4;
}

/**
 * 脅威度評価によるターゲット選択
 */
function selectTargetByThreat(potentialTargets: FieldCard[]): FieldCard | null {
  const scoredTargets = potentialTargets
    .map((target) => {
      let score = target.attack + target.currentHealth;
      if (target.keywords.length > 0) score += 5; // キーワード持ちは脅威
      return { target, score };
    })
    .sort((a, b) => b.score - a.score);

  return scoredTargets[0]?.target || null;
}

/**
 * 攻撃対象の選択（勢力別カスタマイズ版）
 */
export function chooseAttackTarget(
  attacker: FieldCard,
  gameState: GameState,
  random: SeededRandom
): { targetCard: FieldCard | null; targetPlayer: boolean } {
  const currentPlayerId = attacker.owner;
  const currentPlayer = gameState.players[currentPlayerId];
  const opponentId: PlayerId = currentPlayerId === 'player1' ? 'player2' : 'player1';
  const opponent = gameState.players[opponentId];

  const potentialTargets = opponent.field.filter(
    (card) => card.currentHealth > 0 && !card.isStealthed
  );

  // 1. 守護持ちがいれば優先攻撃（普遍的ルール）
  const guardTarget = selectGuardTarget(potentialTargets, random);
  if (guardTarget) {
    return { targetCard: guardTarget, targetPlayer: false };
  }

  // 攻撃可能なクリーチャーがいない場合はプレイヤー攻撃
  if (potentialTargets.length === 0) {
    return { targetCard: null, targetPlayer: true };
  }

  // 2. 勢力別の優先ターゲット
  const priorityTarget = selectFactionPriorityTarget(currentPlayer.faction, potentialTargets);
  if (priorityTarget) {
    return { targetCard: priorityTarget, targetPlayer: false };
  }

  // 3. プレイヤー攻撃の確率判定
  const lifeRatio = currentPlayer.life / GAME_CONSTANTS.INITIAL_LIFE;
  const playerAttackProbability = calculatePlayerAttackProbability(
    currentPlayer.faction,
    lifeRatio
  );

  if (random.next() < playerAttackProbability) {
    return { targetCard: null, targetPlayer: true };
  }

  // 4. 脅威度評価によるターゲット選択
  const threatTarget = selectTargetByThreat(potentialTargets);
  return { targetCard: threatTarget, targetPlayer: false };
}
