import type { GameState, GameAction, FieldCard, PlayerId } from '@/types/game';
import { addCardAttackAction, addTriggerEventAction, addKeywordTriggerAction, addCombatStageAction } from './action-logger';
import { processEffectTrigger, handleCreatureDeath } from './card-effects';
import { applyDamage } from './health-utils';
import { SeededRandom } from './seeded-random';
import { chooseAttackTarget } from './ai-tactics';
import { evaluatePendingDeaths } from './death-sweeper';

/**
 * Phase1 BattleIterator:
 * - battle_attack フェーズで 1 回 next() 呼ぶと 1~2 個存在した攻撃結果のうち 1 GameAction を生成
 * - 現行実装互換: 1 攻撃で最大2つの card_attack action (攻撃者→防御者 / 防御者→攻撃者) を連続で返す
 * - 破壊は別途 handleCreatureDeath 内で actionLog に push される (creature_destroyed)
 */

export interface BattleIteratorContext {
  attackerQueueLength: number;
  currentAttackerId?: string;
  emittedForCurrent?: number; // 現在の攻撃者から何件 action を返したか
}

export interface BattleIterator {
  next(): { done: false; action: GameAction } | { done: true };
  readonly context: BattleIteratorContext;
}

export function createBattleIterator(state: GameState): BattleIterator | null {
  if (state.phase !== 'battle_attack') return null;

  // 攻撃可能カードをスナップショット
  const currentPlayer = state.players[state.currentPlayer];
  const snapshot: FieldCard[] = currentPlayer.field.filter(card =>
    card.currentHealth > 0 &&
    ((!card.isSilenced && card.keywords.includes('rush')) || card.summonTurn < state.turnNumber) &&
    !card.hasAttacked &&
    !card.statusEffects.some(e => e.type === 'stun')
  );

  if (snapshot.length === 0) return null; // 無ければ既存ロジックに任せる

  let attacker: FieldCard | undefined;
  let attackerReturnedActions: GameAction[] = [];

  // サブステージ分離用: 現在処理中 combat の内部状態
  type PendingCombat = {
    attacker: FieldCard;
    target: FieldCard | null;
    targetPlayer: boolean;
    defenderDamage?: number; // 対象に与えるダメージ
    attackerRetaliationDamage?: number; // 反撃込みで攻撃者が受ける総ダメージ
    retaliatePortion?: number; // retaliation 部分のみ
    deathsEvaluated?: boolean; // 死亡判定ステージ完了フラグ
    stageCursor: number; // 0:未開始 1:declare 2:defender 3:attacker 4:deaths 完了
    destroyedQueue: FieldCard[]; // death ステージで処理対象
  } | null;

  let pendingCombat: PendingCombat = null;

  const ctx: BattleIteratorContext = {
    attackerQueueLength: snapshot.length,
  };

  function initPendingCombat(): void {
    attacker = snapshot.shift();
    if (!attacker) return;
    ctx.currentAttackerId = attacker.id;
    ctx.emittedForCurrent = 0;
    attacker.hasAttacked = true;
    processEffectTrigger(state, 'on_attack', attacker, attacker.owner, attacker);
    if (attacker.currentHealth <= 0) {
      // on_attack 効果で死亡した場合はこの攻撃スキップ
      attacker = undefined;
      ctx.currentAttackerId = undefined;
      ctx.emittedForCurrent = undefined;
      return;
    }
    const random = new SeededRandom(state.randomSeed + state.turnNumber + state.phase + attacker.id);
    const { targetCard: target, targetPlayer } = chooseAttackTarget(attacker, state, random);
    const totalAttack = attacker.attack + attacker.attackModifier + attacker.passiveAttackModifier;
    const defenderDamage = Math.max(0, totalAttack);
    let retaliation = 0;
    let attackerTotalDamage = 0;
    if (target) {
      const targetAttack = target.attack + target.attackModifier + target.passiveAttackModifier;
      const retaliateDamage = !target.isSilenced && target.keywords.includes('retaliate')
        ? Math.ceil(targetAttack / 2) : 0;
      retaliation = retaliateDamage;
      attackerTotalDamage = Math.max(0, targetAttack) + retaliateDamage;
    }
    pendingCombat = {
      attacker,
      target: target ?? null,
      targetPlayer,
      defenderDamage,
      attackerRetaliationDamage: attackerTotalDamage > 0 ? attackerTotalDamage : undefined,
      retaliatePortion: retaliation > 0 ? retaliation : undefined,
      stageCursor: 0,
      destroyedQueue: [],
      deathsEvaluated: false,
    };
  }

  // 差分抽出のため最後の actionLog index を記録
  let lastIndex = state.actionLog.length;

  function captureNewActions(): void {
    const all = state.actionLog;
    if (all.length > lastIndex) {
      attackerReturnedActions = all.slice(lastIndex);
      lastIndex = all.length;
    } else {
      attackerReturnedActions = [];
    }
  }

  function progressPendingCombat(): void {
    if (!pendingCombat) return;
    const pc = pendingCombat;
    const currentPlayerId: PlayerId = pc.attacker.owner;
    const opponentId: PlayerId = currentPlayerId === 'player1' ? 'player2' : 'player1';
    const opponent = state.players[opponentId];

    // stageCursor:
    // 0 -> emit attack_declare
    // 1 -> apply defender damage (if target creature) or player life damage
    // 2 -> apply attacker retaliation damage (if any)
    // 3 -> evaluate deaths & emit deaths stage (if any)
    // 4 -> cleanup & finalize

    if (pc.stageCursor === 0) {
      handleStageDeclare(pc, currentPlayerId);
      return; 
    }

    if (pc.stageCursor === 1) {
      handleStageDefender(pc, currentPlayerId, opponentId, opponent);
      return; 
    }

    if (pc.stageCursor === 2) {
      handleStageAttacker(pc, currentPlayerId, opponentId);
      return; 
    }

    if (pc.stageCursor === 3) {
      handleStageDeaths(pc, currentPlayerId);
      return; 
    }

    if (pc.stageCursor >= 4) {
      // combat 終了
      pendingCombat = null;
      attacker = undefined;
      ctx.currentAttackerId = undefined;
      ctx.emittedForCurrent = undefined;
    }
  }

  function handleStageDeclare(pc: NonNullable<typeof pendingCombat>, currentPlayerId: PlayerId): void {
    if (pc.target) {
      addCombatStageAction(state, currentPlayerId, {
        stage: 'attack_declare',
        attackerId: pc.attacker.id,
        targetId: pc.target.id,
      });
    } else if (pc.targetPlayer) {
      addCombatStageAction(state, currentPlayerId, {
        stage: 'attack_declare',
        attackerId: pc.attacker.id,
      });
    }
    pc.stageCursor = 1;
    captureNewActions();
  }

  function handleStageDefender(pc: NonNullable<typeof pendingCombat>, currentPlayerId: PlayerId, opponentId: PlayerId, opponent: ReturnType<typeof Object['values']>[number]): void {
    if (pc.target) {
  const before = pc.target.currentHealth;
	applyDamage(pc.target, pc.defenderDamage || 0);
  const after = pc.target.currentHealth;
  const actualDamage = Math.max(0, before - after);
      addTriggerEventAction(state, currentPlayerId, {
        triggerType: 'on_damage_taken',
        sourceCardId: pc.attacker.id,
        targetCardId: pc.target.id,
      });
      processEffectTrigger(state, 'on_damage_taken', pc.target, opponentId, pc.attacker);
      addCombatStageAction(state, currentPlayerId, {
        stage: 'damage_defender',
        attackerId: pc.attacker.id,
        targetId: pc.target.id,
        values: { damage: pc.defenderDamage }
      });
      addCardAttackAction(state, currentPlayerId, {
        attackerCardId: pc.attacker.id,
        targetId: pc.target.id,
        damage: pc.defenderDamage || 0,
        targetHealth: { before, after },
      });
    applyOffensiveKeywords(pc, currentPlayerId, opponentId, before, actualDamage);
      // 防御側ダメージ反映後チェーン効果で第三者死亡した可能性を回収
      evaluatePendingDeaths(state, 'system', pc.attacker.id);
    } else if (pc.targetPlayer) {
      const playerLifeBefore = opponent.life;
      opponent.life = Math.max(0, opponent.life - (pc.defenderDamage || 0));
      const playerLifeAfter = opponent.life;
      addCardAttackAction(state, currentPlayerId, {
        attackerCardId: pc.attacker.id,
        targetId: opponent.id,
        damage: pc.defenderDamage || 0,
        targetPlayerLife: { before: playerLifeBefore, after: playerLifeAfter },
      });
      const actualPlayerDamage = Math.max(0, playerLifeBefore - playerLifeAfter);
      applyDirectAttackKeywords(pc, currentPlayerId, opponentId, opponent.id, actualPlayerDamage);
      evaluatePendingDeaths(state, 'system', pc.attacker.id);
    }
    pc.stageCursor = 2;
    captureNewActions();
  }

  function applyOffensiveKeywords(pc: NonNullable<typeof pendingCombat>, currentPlayerId: PlayerId, opponentId: PlayerId, defenderBefore: number, actualDamage: number): void {
    if (actualDamage > 0 && !pc.attacker.isSilenced && pc.attacker.keywords.includes('lifesteal')) {
      const owner = state.players[currentPlayerId];
      owner.life += actualDamage;
      addKeywordTriggerAction(state, currentPlayerId, {
        keyword: 'lifesteal',
        sourceCardId: pc.attacker.id,
        targetId: pc.target!.id,
        value: actualDamage,
      });
    }
    if (!pc.attacker.isSilenced && pc.attacker.keywords.includes('poison')) {
      pc.target!.statusEffects.push({ type: 'poison', duration: 2, damage: 1 });
      addKeywordTriggerAction(state, currentPlayerId, {
        keyword: 'poison',
        sourceCardId: pc.attacker.id,
        targetId: pc.target!.id,
        value: 1,
      });
    }
    if (!pc.attacker.isSilenced && pc.attacker.keywords.includes('trample')) {
      const excess = (pc.defenderDamage || 0) - defenderBefore;
      if (excess > 0) {
        const opp = state.players[opponentId];
        opp.life = Math.max(0, opp.life - excess);
        addKeywordTriggerAction(state, currentPlayerId, {
          keyword: 'trample',
          sourceCardId: pc.attacker.id,
          targetId: opp.id,
          value: excess,
        });
      }
    }
  }

  function applyDirectAttackKeywords(pc: NonNullable<typeof pendingCombat>, currentPlayerId: PlayerId, opponentId: PlayerId, opponentEntityId: string, actualPlayerDamage: number): void {
    if (actualPlayerDamage > 0 && !pc.attacker.isSilenced && pc.attacker.keywords.includes('lifesteal')) {
      const owner = state.players[currentPlayerId];
      owner.life += actualPlayerDamage;
      addKeywordTriggerAction(state, currentPlayerId, {
        keyword: 'lifesteal',
        sourceCardId: pc.attacker.id,
        targetId: opponentEntityId,
        value: actualPlayerDamage,
      });
    }
  }

  function handleStageAttacker(pc: NonNullable<typeof pendingCombat>, currentPlayerId: PlayerId, opponentId: PlayerId): void {
    if (pc.target && pc.attackerRetaliationDamage && pc.attackerRetaliationDamage > 0) {
      if (pc.retaliatePortion && pc.retaliatePortion > 0) {
        addKeywordTriggerAction(state, opponentId, {
          keyword: 'retaliate',
          sourceCardId: pc.target.id,
          targetId: pc.attacker.id,
          value: pc.retaliatePortion,
        });
      }
      const before = pc.attacker.currentHealth;
  applyDamage(pc.attacker, pc.attackerRetaliationDamage);
      const after = pc.attacker.currentHealth;
      addTriggerEventAction(state, opponentId, {
        triggerType: 'on_damage_taken',
        sourceCardId: pc.target.id,
        targetCardId: pc.attacker.id,
      });
      processEffectTrigger(state, 'on_damage_taken', pc.attacker, currentPlayerId, pc.target);
      addCombatStageAction(state, opponentId, {
        stage: 'damage_attacker',
        attackerId: pc.target.id,
        targetId: pc.attacker.id,
        values: { damage: pc.attackerRetaliationDamage, retaliate: pc.retaliatePortion },
      });
      addCardAttackAction(state, opponentId, {
        attackerCardId: pc.target.id,
        targetId: pc.attacker.id,
        damage: pc.attackerRetaliationDamage,
        attackerHealth: { before, after },
      });
      evaluatePendingDeaths(state, 'system', pc.target.id);
    }
    pc.stageCursor = 3;
    captureNewActions();
  }

  function handleStageDeaths(pc: NonNullable<typeof pendingCombat>, currentPlayerId: PlayerId): void {
    const destroyed: string[] = [];
    if (pc.target && pc.target.currentHealth <= 0) destroyed.push(pc.target.id);
    if (pc.attacker.currentHealth <= 0) destroyed.push(pc.attacker.id);
    if (destroyed.length > 0) {
      addCombatStageAction(state, currentPlayerId, {
        stage: 'deaths',
        attackerId: pc.attacker.id,
        values: { destroyed },
      });
      for (const id of destroyed) {
        const card = id === pc.attacker.id ? pc.attacker : (pc.target && id === pc.target.id ? pc.target : undefined);
        if (card) handleCreatureDeath(state, card, 'combat', pc.attacker.id);
      }
    }
    pc.stageCursor = 4;
    captureNewActions();
  }

  return {
    get context() { return ctx; },
    next(): { done: false; action: GameAction } | { done: true } {
      // まだ返していない action があるならそれを1件ずつ返す
      if (attackerReturnedActions.length > 0) {
        const next = attackerReturnedActions.shift()!;
        ctx.emittedForCurrent = (ctx.emittedForCurrent || 0) + 1;
        return { done: false, action: next };
      }

      // 次の攻撃者が必要
      if (!pendingCombat) {
        if (snapshot.length === 0) {
          return { done: true };
        }
        initPendingCombat();
        if (!pendingCombat) {
          return this.next();
        }
        progressPendingCombat();
        if (attackerReturnedActions.length > 0) {
          const first = attackerReturnedActions.shift()!;
          ctx.emittedForCurrent = (ctx.emittedForCurrent || 0) + 1;
          return { done: false, action: first };
        }
        return this.next();
      } else {
        progressPendingCombat();
        if (attackerReturnedActions.length > 0) {
          const next = attackerReturnedActions.shift()!;
          ctx.emittedForCurrent = (ctx.emittedForCurrent || 0) + 1;
          return { done: false, action: next };
        }
        return this.next();
      }
    }
  };
}
