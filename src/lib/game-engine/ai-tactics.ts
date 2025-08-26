/**
 * Ashenhall AI 戦術エンジン
 * 
 * 設計方針:
 * - 勢力ごとの特色ある戦術を実装
 * - 盤面全体を評価した最適な行動選択
 * - テスト容易な純粋関数として実装
 */

import type { GameState, Card, FieldCard, PlayerId, Faction, TacticsType, EffectTarget } from '@/types/game';
import { GAME_CONSTANTS, AI_EVALUATION_WEIGHTS } from '@/types/game';
import { SeededRandom } from './seeded-random';

const { BASE_SCORE, TACTICS_MODIFIERS, FACTION_BONUSES } = AI_EVALUATION_WEIGHTS;

// --- 戦術別スコア計算 ---
const getAggressiveScore = (card: Card) => (card.type === 'creature' ? card.attack * TACTICS_MODIFIERS.AGGRESSIVE.ATTACK + card.health * TACTICS_MODIFIERS.AGGRESSIVE.HEALTH - card.cost : 0);
const getDefensiveScore = (card: Card) => (card.type === 'creature' ? card.health * TACTICS_MODIFIERS.DEFENSIVE.HEALTH + card.attack * TACTICS_MODIFIERS.DEFENSIVE.ATTACK - card.cost : 0);
const getTempoScore = (card: Card) => {
  if (card.type !== 'creature') return 0;
  const costEfficiency = (card.attack + card.health) / Math.max(card.cost, 1);
  return costEfficiency * TACTICS_MODIFIERS.TEMPO.EFFICIENCY - card.cost * TACTICS_MODIFIERS.TEMPO.COST_PENALTY;
};
const getBalancedScore = (card: Card) => {
  if (card.type !== 'creature') return 0;
  return (card.attack + card.health) / Math.max(card.cost, 1);
};

const tacticsScorers: Record<TacticsType, (card: Card) => number> = {
  aggressive: getAggressiveScore,
  defensive: getDefensiveScore,
  tempo: getTempoScore,
  balanced: getBalancedScore,
};

// NOTE:以降の関数はテストのためにエクスポートされています
export const calculateBaseScore = (card: Card, gameState: GameState, playerId: PlayerId): number => {
  if (card.type === 'spell') {
    return card.cost * BASE_SCORE.SPELL_COST_MULTIPLIER;
  }
  const tactics = gameState.players[playerId].tacticsType;
  const scorer = tacticsScorers[tactics] || getBalancedScore;
  return scorer(card);
};

// --- 勢力別ボーナス計算 ---
const getNecromancerBonus = (card: Card, player: GameState['players'][PlayerId]) => {
  let bonus = 0;
  if (card.keywords.includes('echo')) bonus += player.graveyard.length * FACTION_BONUSES.NECROMANCER.ECHO_PER_GRAVEYARD;
  if (card.effects.some(e => e.trigger === 'on_death')) bonus += FACTION_BONUSES.NECROMANCER.ON_DEATH;
  return bonus;
};

const getKnightBonus = (card: Card, player: GameState['players'][PlayerId]) => {
  let bonus = 0;
  if (card.keywords.includes('formation')) bonus += player.field.length * FACTION_BONUSES.KNIGHT.FORMATION_PER_ALLY;
  if (card.keywords.includes('guard')) bonus += FACTION_BONUSES.KNIGHT.GUARD;
  return bonus;
};

const getBerserkerBonus = (card: Card, player: GameState['players'][PlayerId]) => {
  let bonus = 0;
  const lifeDeficit = GAME_CONSTANTS.INITIAL_LIFE - player.life;
  if (lifeDeficit > 0) bonus += lifeDeficit * FACTION_BONUSES.BERSERKER.PER_LIFE_DEFICIT;
  if (card.type === 'creature' && card.attack > card.health) bonus += card.attack * FACTION_BONUSES.BERSERKER.HIGH_ATTACK;
  return bonus;
};

const getMageBonus = (card: Card, _player: GameState['players'][PlayerId], _opponent: GameState['players'][PlayerId]) => {
  let bonus = 0;
  if (card.type === 'spell') bonus += FACTION_BONUSES.MAGE.SPELL_PLAY;
  if (card.effects.some(e => e.trigger === 'on_spell_play')) bonus += FACTION_BONUSES.MAGE.ON_SPELL_PLAY_TRIGGER;
  return bonus;
};

const getInquisitorBonus = (card: Card, _player: GameState['players'][PlayerId], opponent: GameState['players'][PlayerId]) => {
  let bonus = 0;
  if (card.effects.some(e => e.action.includes('debuff') || e.action.includes('destroy'))) {
    bonus += opponent.field.length * FACTION_BONUSES.INQUISITOR.DEBUFF_PER_ENEMY;
  }
  if (card.effects.some(e => e.action === 'silence' || e.action === 'stun')) bonus += FACTION_BONUSES.INQUISITOR.SILENCE_STUN;
  return bonus;
};

type FactionScorer = (card: Card, player: GameState['players'][PlayerId], opponent: GameState['players'][PlayerId]) => number;

const factionScorers: Record<Faction, FactionScorer> = {
  necromancer: getNecromancerBonus,
  knight: getKnightBonus,
  berserker: getBerserkerBonus,
  mage: getMageBonus,
  inquisitor: getInquisitorBonus,
};

export const calculateFactionBonus = (card: Card, gameState: GameState, playerId: PlayerId): number => {
  const player = gameState.players[playerId];
  const opponent = gameState.players[playerId === 'player1' ? 'player2' : 'player1'];
  const scorer = factionScorers[player.faction];
  return scorer ? scorer(card, player, opponent) : 0;
};

/**
 * カード効果が有効な対象を見つけられるかチェック
 * @param card チェック対象のカード
 * @param gameState 現在のゲーム状態
 * @param playerId カードをプレイするプレイヤー
 * @returns 有効な対象が存在する場合true
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
    const target = effect.target;
    
    switch (target) {
      case 'self':
      case 'player':
        // 自分自身またはプレイヤー対象は常に有効
        continue;

      case 'ally_all':
      case 'ally_random':
        // 味方に有効な対象がいるかチェック
        const validAllies = sourcePlayer.field.filter(
          ally => ally.currentHealth > 0
        );
        if (validAllies.length === 0) {
          return false;
        }
        break;

      case 'enemy_all':
      case 'enemy_random':
        // 敵に有効な対象がいるかチェック（untargetableを除外）
        const validEnemies = opponent.field.filter(
          enemy => enemy.currentHealth > 0 && !enemy.keywords.includes('untargetable')
        );
        if (validEnemies.length === 0) {
          return false;
        }
        break;

      default:
        // 不明な対象タイプは有効とみなす
        continue;
    }
  }

  return true;
}

/**
 * カード配置の評価（無駄撃ち防止版）
 * @param card 評価対象のカード
 * @param gameState 現在のゲーム状態
 * @param playerId AIプレイヤーのID
 * @returns カードの評価スコア
 */
export function evaluateCardForPlay(card: Card, gameState: GameState, playerId: PlayerId): number {
  // 無駄撃ち防止: 対象が存在しない場合は大幅ペナルティ
  if (!canEffectFindValidTargets(card, gameState, playerId)) {
    return -1000; // 大幅なペナルティを適用
  }

  const baseScore = calculateBaseScore(card, gameState, playerId);
  const factionBonus = calculateFactionBonus(card, gameState, playerId);
  return baseScore + factionBonus;
}

/**
 * 攻撃対象の選択（高度化版）
 * @param attacker 攻撃するクリーチャー
 * @param gameState 現在のゲーム状態
 * @param random 決定論的乱数生成器
 * @returns 攻撃対象（クリーチャーまたはプレイヤー）
 */
export function chooseAttackTarget(
  attacker: FieldCard,
  gameState: GameState,
  random: SeededRandom
): { targetCard: FieldCard | null; targetPlayer: boolean } {
  const currentPlayerId = attacker.owner;
  const opponentId = currentPlayerId === 'player1' ? 'player2' : 'player1';
  const opponent = gameState.players[opponentId];

  const potentialTargets = opponent.field.filter(card => card.currentHealth > 0 && !card.isStealthed);
  const guardCreatures = potentialTargets.filter(c => c.keywords.includes('guard') && !c.isSilenced);

  // 1. 守護持ちがいれば、その中からランダムに選択
  if (guardCreatures.length > 0) {
    return { targetCard: random.choice(guardCreatures) || null, targetPlayer: false };
  }

  // 2. 守護持ちがいない場合、脅威度を計算してターゲットを決定
  if (potentialTargets.length > 0) {
    // プレイヤーを攻撃する確率（仮）
    const playerAttackProbability = 0.3; 
    if (random.next() < playerAttackProbability) {
      return { targetCard: null, targetPlayer: true };
    }

    // 各ターゲットの脅威度を評価（仮のロジック）
    const scoredTargets = potentialTargets.map(target => {
      let score = target.attack + target.currentHealth;
      if (target.keywords.length > 0) score += 5; // キーワード持ちは脅威
      return { target, score };
    }).sort((a, b) => b.score - a.score);

    return { targetCard: scoredTargets[0]?.target || null, targetPlayer: false };
  }

  // 3. 攻撃対象クリーチャーがいない場合はプレイヤーを攻撃
  return { targetCard: null, targetPlayer: true };
}
