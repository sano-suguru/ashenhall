/**
 * Ashenhall AI 戦術エンジン
 * 
 * 設計方針:
 * - 勢力ごとの特色ある戦術を実装
 * - 盤面全体を評価した最適な行動選択
 * - テスト容易な純粋関数として実装
 */

import type { GameState, Card, FieldCard, PlayerId, Faction, TacticsType } from '@/types/game';
import { GAME_CONSTANTS } from '@/types/game';
import { SeededRandom } from './seeded-random';

// --- 戦術別スコア計算 ---
const getAggressiveScore = (card: Card) => (card.type === 'creature' ? card.attack * 2 + card.health - card.cost : 0);
const getDefensiveScore = (card: Card) => (card.type === 'creature' ? card.health * 2 + card.attack - card.cost : 0);
const getTempoScore = (card: Card) => {
  if (card.type !== 'creature') return 0;
  const costEfficiency = (card.attack + card.health) / Math.max(card.cost, 1);
  return costEfficiency * 3 - card.cost * 2;
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
    return card.cost * 1.5;
  }
  const tactics = gameState.players[playerId].tacticsType;
  const scorer = tacticsScorers[tactics] || getBalancedScore;
  return scorer(card);
};

// --- 勢力別ボーナス計算 ---
const getNecromancerBonus = (card: Card, player: GameState['players'][PlayerId]) => {
  let bonus = 0;
  if (card.keywords.includes('echo')) bonus += player.graveyard.length * 3;
  if (card.effects.some(e => e.trigger === 'on_death')) bonus += 5;
  return bonus;
};

const getKnightBonus = (card: Card, player: GameState['players'][PlayerId]) => {
  let bonus = 0;
  if (card.keywords.includes('formation')) bonus += player.field.length * 4;
  if (card.keywords.includes('guard')) bonus += 6;
  return bonus;
};

const getBerserkerBonus = (card: Card, player: GameState['players'][PlayerId]) => {
  let bonus = 0;
  const lifeDeficit = GAME_CONSTANTS.INITIAL_LIFE - player.life;
  if (lifeDeficit > 0) bonus += lifeDeficit * 1.5;
  if (card.type === 'creature' && card.attack > card.health) bonus += card.attack * 2;
  return bonus;
};

const getMageBonus = (card: Card, _player: GameState['players'][PlayerId], _opponent: GameState['players'][PlayerId]) => {
  let bonus = 0;
  if (card.type === 'spell') bonus += 15;
  if (card.effects.some(e => e.trigger === 'on_spell_play')) bonus += 10;
  return bonus;
};

const getInquisitorBonus = (card: Card, _player: GameState['players'][PlayerId], opponent: GameState['players'][PlayerId]) => {
  let bonus = 0;
  if (card.effects.some(e => e.action.includes('debuff') || e.action.includes('destroy'))) {
    bonus += opponent.field.length * 3;
  }
  if (card.effects.some(e => e.action === 'silence' || e.action === 'stun')) bonus += 8;
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
 * カード配置の評価（リファクタリング版）
 * @param card 評価対象のカード
 * @param gameState 現在のゲーム状態
 * @param playerId AIプレイヤーのID
 * @returns カードの評価スコア
 */
export function evaluateCardForPlay(card: Card, gameState: GameState, playerId: PlayerId): number {
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
