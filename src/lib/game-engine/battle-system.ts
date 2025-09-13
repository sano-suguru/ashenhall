/**
 * Ashenhall 戦闘システム
 * 
 * 設計方針:
 * - 戦闘フェーズの処理を細分化
 * - キーワード効果の統一的な処理
 * - 決定論的な戦闘計算
 */

import type {
  GameState,
  PlayerId,
  FieldCard,
} from "@/types/game";
import { SeededRandom } from "./seeded-random";
import { advancePhase } from "./game-state";
import {
  addCardAttackAction,
  addTriggerEventAction,
  addKeywordTriggerAction,
} from "./action-logger";
import {
  applyPassiveEffects,
  processEffectTrigger,
  handleCreatureDeath,
} from "./card-effects";
import { chooseAttackTarget } from "./ai-tactics";


/**
 * 守護クリーチャーを検出
 */
function getGuardCreatures(field: FieldCard[]): FieldCard[] {
  return field.filter(
    (card) =>
      card.currentHealth > 0 &&
      !card.isSilenced &&
      card.keywords.includes("guard")
  );
}

/**
 * キーワード効果の処理
 */
function processKeywordEffects(
  state: GameState,
  attacker: FieldCard,
  target: FieldCard | null,
  targetPlayer: boolean,
  damage: number
): void {
  const currentPlayerId = attacker.owner;
  const opponentId: PlayerId = currentPlayerId === "player1" ? "player2" : "player1";
  const currentPlayer = state.players[currentPlayerId];
  const opponent = state.players[opponentId];

  // Lifesteal (吸血) 処理
  if (
    damage > 0 &&
    !attacker.isSilenced &&
    attacker.keywords.includes("lifesteal")
  ) {
    currentPlayer.life += damage;
  }

  // Poison (毒) 処理
  if (target && !attacker.isSilenced && attacker.keywords.includes("poison")) {
    target.statusEffects.push({ type: "poison", duration: 2, damage: 1 });
  }

  // Trample (貫通) 処理
  if (target && !attacker.isSilenced && attacker.keywords.includes("trample")) {
    const excessDamage = damage - target.currentHealth;
    if (excessDamage > 0) {
      const playerLifeBefore = opponent.life;
      opponent.life -= excessDamage;
      const playerLifeAfter = opponent.life;
      addKeywordTriggerAction(state, currentPlayerId, {
        keyword: 'trample',
        sourceCardId: attacker.id,
        targetId: opponent.id,
        value: excessDamage,
      });
    }
  }
}


/**
 * 戦闘フェーズの処理（battle_attackフェーズへの移行）
 */
export function processBattlePhase(state: GameState): void {
  applyPassiveEffects(state);
  
  // battle_attack フェーズに直接移行（リスト作成不要）
  state.phase = 'battle_attack';
}

/**
 * 攻撃フェーズの処理（動的攻撃者チェック）
 */
export function processAttackPhase(state: GameState): void {
  const currentPlayer = state.players[state.currentPlayer];

  // ゲーム終了チェック
  if (state.players.player1.life <= 0 || state.players.player2.life <= 0) {
    advancePhase(state);
    return;
  }

  // 毎回リアルタイムで攻撃可能カードを評価
  const availableAttackers = currentPlayer.field.filter(
    (card) =>
      card.currentHealth > 0 &&
      ((!card.isSilenced && card.keywords.includes("rush")) ||
        card.summonTurn < state.turnNumber) &&
      !card.hasAttacked &&
      !card.statusEffects.some((e) => e.type === "stun")
  );

  if (availableAttackers.length === 0) {
    // 攻撃可能カードがない → end フェーズへ
    advancePhase(state);
    return;
  }

  // 最初の1体だけ攻撃処理
  const attacker = availableAttackers[0];
  const random = new SeededRandom(
    state.randomSeed + state.turnNumber + state.phase + attacker.id
  );
  
  processAttackerTurn(state, attacker, random);
  
  // battle_attack フェーズを継続（次のprocessAttackPhaseで再評価）
}

/**
 * 個別攻撃者の処理（シンプル版）
 */
function processAttackerTurn(
  state: GameState,
  attacker: FieldCard,
  random: SeededRandom
): void {
  const currentPlayerId = attacker.owner;
  const opponentId: PlayerId = currentPlayerId === "player1" ? "player2" : "player1";
  const opponent = state.players[opponentId];

  if (attacker.currentHealth <= 0) {
    attacker.hasAttacked = true;
    return;
  }

  // 攻撃前にhasAttackedをtrueに設定
  attacker.hasAttacked = true;

  processEffectTrigger(state, "on_attack", attacker, currentPlayerId, attacker);
  
  if (attacker.currentHealth <= 0) return;

  let { targetCard: target, targetPlayer } = chooseAttackTarget(attacker, state, random);

  // 守護キーワードの強制処理
  const opponentGuardCreatures = getGuardCreatures(opponent.field);
  if (opponentGuardCreatures.length > 0) {
    let mustRetarget = false;
    if (targetPlayer) {
      mustRetarget = true;
    } else if (target) {
      const targetIsGuard = opponentGuardCreatures.some(guard => guard.id === target!.id);
      if (!targetIsGuard) {
        mustRetarget = true;
      }
    } else {
      mustRetarget = true;
    }
    
    if (mustRetarget) {
      target = random.choice(opponentGuardCreatures)!;
      targetPlayer = false;
    }
  }

  // 戦闘ダメージ処理
  handleCombatDamage(state, attacker, target, targetPlayer);
}

/**
 * 戦闘ダメージの処理（演出統合版）
 */
function handleCombatDamage(
  state: GameState,
  attacker: FieldCard,
  target: FieldCard | null,
  targetPlayer: boolean
): void {
  const currentPlayerId = attacker.owner;
  const opponentId: PlayerId = currentPlayerId === "player1" ? "player2" : "player1";
  const opponent = state.players[opponentId];
  
  const totalAttack = attacker.attack + attacker.attackModifier + attacker.passiveAttackModifier;
  const damage = Math.max(0, totalAttack);

  // キーワード効果を先に処理
  processKeywordEffects(state, attacker, target, targetPlayer, damage);

  if (target) {
    const targetHealthBefore = target.currentHealth;
    target.currentHealth -= damage;
    const targetHealthAfter = target.currentHealth;

    addTriggerEventAction(state, currentPlayerId, {
      triggerType: 'on_damage_taken',
      sourceCardId: attacker.id,
      targetCardId: target.id,
    });

    processEffectTrigger(state, "on_damage_taken", target, opponentId, attacker);

    addCardAttackAction(state, currentPlayerId, {
      attackerCardId: attacker.id,
      targetId: target.id,
      damage,
      targetHealth: { before: targetHealthBefore, after: targetHealthAfter },
      animation: {
        attackingCardId: attacker.id,
        beingAttackedCardId: target.id,
        displayDamage: damage,
        isTargetDestroyed: target.currentHealth <= 0,
        startTime: state.actionLog.length, // 完全決定論的（sequence番号）
      },
    });

    // 同時戦闘ダメージ: 反撃ダメージを事前計算（生死に関係なく）
    const totalTargetAttack = target.attack + target.attackModifier + target.passiveAttackModifier;
    const retaliateDamage = !target.isSilenced && target.keywords.includes("retaliate")
      ? Math.ceil(totalTargetAttack / 2) : 0;
    const defenderDamage = Math.max(0, totalTargetAttack) + retaliateDamage;

    // retaliate効果のログ記録（発動時のみ）
    if (retaliateDamage > 0) {
      addKeywordTriggerAction(state, opponentId, {
        keyword: 'retaliate',
        sourceCardId: target.id,
        targetId: attacker.id,
        value: retaliateDamage,
      });
    }

    // 攻撃者への同時ダメージ適用（被攻撃者の生死に関係なく）
    if (defenderDamage > 0) {
      const attackerHealthBefore = attacker.currentHealth;
      attacker.currentHealth -= defenderDamage;
      const attackerHealthAfter = attacker.currentHealth;

      addTriggerEventAction(state, opponentId, {
        triggerType: 'on_damage_taken',
        sourceCardId: target.id,
        targetCardId: attacker.id,
      });
      
      processEffectTrigger(state, "on_damage_taken", attacker, currentPlayerId, target);
      
      addCardAttackAction(state, opponentId, {
        attackerCardId: target.id,
        targetId: attacker.id,
        damage: defenderDamage,
        attackerHealth: { before: attackerHealthBefore, after: attackerHealthAfter },
        animation: {
          attackingCardId: target.id,
          beingAttackedCardId: attacker.id,
          displayDamage: defenderDamage,
          isTargetDestroyed: attacker.currentHealth <= 0,
          startTime: state.actionLog.length,
        },
      });
    }

    // 事後の死亡判定（同時戦闘後）
    if (target.currentHealth <= 0) {
      handleCreatureDeath(state, target, 'combat', attacker.id);
    }
    if (attacker.currentHealth <= 0) {
      handleCreatureDeath(state, attacker, 'combat', target.id);
    }
  } else if (targetPlayer) {
    const playerLifeBefore = opponent.life;
    opponent.life = Math.max(0, opponent.life - damage);
    const playerLifeAfter = opponent.life;
    addCardAttackAction(state, currentPlayerId, {
      attackerCardId: attacker.id,
      targetId: opponent.id,
      damage,
      targetPlayerLife: { before: playerLifeBefore, after: playerLifeAfter },
      animation: {
        attackingCardId: attacker.id,
        beingAttackedCardId: undefined, // プレイヤー攻撃なのでカードなし
        displayDamage: damage,
        isTargetDestroyed: false, // プレイヤーは破壊されない
        startTime: state.actionLog.length, // 完全決定論的（sequence番号）
      },
    });
  }
}
