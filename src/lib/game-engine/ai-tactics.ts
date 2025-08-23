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

/**
 * カード配置の評価（高度化版）
 * @param card 評価対象のカード
 * @param gameState 現在のゲーム状態
 * @param playerId AIプレイヤーのID
 * @returns カードの評価スコア
 */
export function evaluateCardForPlay(card: Card, gameState: GameState, playerId: PlayerId): number {
  const player = gameState.players[playerId];
  const opponent = gameState.players[playerId === 'player1' ? 'player2' : 'player1'];
  const tactics = player.tacticsType;

  let baseScore = 0;
  if (card.type === 'spell') {
    baseScore = card.cost * 1.5; // 基本スコア
  } else if (card.type === 'creature') {
    const baseValue = card.attack + card.health;
    const costEfficiency = baseValue / Math.max(card.cost, 1);
    switch (tactics) {
      case 'aggressive':
        baseScore = card.attack * 2 + card.health - card.cost;
        break;
      case 'defensive':
        baseScore = card.health * 2 + card.attack - card.cost;
        break;
      case 'tempo':
        baseScore = costEfficiency * 3 - card.cost * 2;
        break;
      case 'balanced':
      default:
        baseScore = costEfficiency;
        break;
    }
  }

  // 勢力ボーナス（より盤面を考慮するように拡張）
  let factionBonus = 0;
  switch (player.faction) {
    case 'necromancer':
      if (card.keywords.includes('echo')) factionBonus += player.graveyard.length * 3;
      if (card.effects.some(e => e.trigger === 'on_death')) factionBonus += 5;
      break;
    case 'knight':
      if (card.keywords.includes('formation')) factionBonus += player.field.length * 4;
      if (card.keywords.includes('guard')) factionBonus += 6;
      break;
    case 'berserker':
      const lifeDeficit = GAME_CONSTANTS.INITIAL_LIFE - player.life;
      if (lifeDeficit > 0) factionBonus += lifeDeficit * 1.5;
      if (card.type === 'creature' && card.attack > card.health) factionBonus += card.attack * 2;
      break;
    case 'mage':
      if (card.type === 'spell') factionBonus += 15;
      if (card.effects.some(e => e.trigger === 'on_spell_play')) factionBonus += 10;
      break;
    case 'inquisitor':
      if (card.effects.some(e => e.action.includes('debuff') || e.action.includes('destroy'))) {
        factionBonus += opponent.field.length * 3;
      }
      if (card.effects.some(e => e.action === 'silence' || e.action === 'stun')) factionBonus += 8;
      break;
  }

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
