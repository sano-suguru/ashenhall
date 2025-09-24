import type { GameState, FieldCard, GameAction } from '@/types/game';

// バージョン識別子（将来フォーマット変更時トラブルシュート用）
const DEATH_INVARIANT_VERSION = 1;

interface RelevantActionSummary {
  sequence: number;
  type: string;
  summary: string;
}

function summarizeAction(action: GameAction): string {
  try {
    switch (action.type) {
      case 'card_attack': {
        const d = action.data;
        return `card_attack attacker=${d.attackerCardId} target=${d.targetId} dmg=${d.damage}`;
      }
      case 'combat_stage': {
        const d = action.data;
        return `combat_stage stage=${d.stage} attacker=${d.attackerId}${d.targetId ? ` target=${d.targetId}` : ''}`;
      }
      case 'creature_destroyed': {
        const d = action.data;
        return `creature_destroyed target=${d.destroyedCardId}`;
      }
      case 'effect_trigger': {
        return `effect_trigger kind=${action.data.effectType}`;
      }
      case 'keyword_trigger': {
        return `keyword_trigger kw=${action.data.keyword}`;
      }
      case 'trigger_event': {
        return `trigger_event trig=${action.data.triggerType}`;
      }
      default:
        return action.type;
    }
  } catch {
    return action.type;
  }
}

function actionReferencesCard(action: GameAction, cardId: string): boolean {
  const d: any = action.data as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!d) return false;
  // 代表的なフィールドを探索（将来的に拡張）
  const fields = [
    d.attackerCardId,
    d.targetId,
    d.attackerId,
    d.destroyedCardId,
    d.sourceCardId,
    d.targetCardId,
  ];
  if (fields.includes(cardId)) return true;
  if (Array.isArray(d.targetIds) && d.targetIds.includes(cardId)) return true;
  if (Array.isArray(d.values?.destroyed) && d.values.destroyed.includes(cardId)) return true;
  return false;
}

function collectDuplicatePresence(state: GameState, cardId: string) {
  const zones: Record<string, number> = {
    field_p1: 0, field_p2: 0,
    grave_p1: 0, grave_p2: 0,
    hand_p1: 0, hand_p2: 0,
    banished_p1: 0, banished_p2: 0,
  };
  state.players.player1.field.forEach(c => { if (c.id === cardId) zones.field_p1++; });
  state.players.player2.field.forEach(c => { if (c.id === cardId) zones.field_p2++; });
  state.players.player1.graveyard.forEach(c => { if (c.id === cardId) zones.grave_p1++; });
  state.players.player2.graveyard.forEach(c => { if (c.id === cardId) zones.grave_p2++; });
  state.players.player1.hand.forEach(c => { if (c.id === cardId) zones.hand_p1++; });
  state.players.player2.hand.forEach(c => { if (c.id === cardId) zones.hand_p2++; });
  state.players.player1.banishedCards.forEach(c => { if (c.id === cardId) zones.banished_p1++; });
  state.players.player2.banishedCards.forEach(c => { if (c.id === cardId) zones.banished_p2++; });
  return zones;
}

export function assertNoLingeringDeadCreatures(state: GameState): void {
  const actions = state.actionLog;

  const destroyedIds = new Set(
    actions
      .filter(a => a.type === 'creature_destroyed')
      .map(a => (a as Extract<GameAction,{type:'creature_destroyed'}>).data.destroyedCardId)
  );

  function inspectCard(card: FieldCard) {
    if (card.currentHealth > 0) return; // only <=0
    // 既に破壊アクションが存在するなら許容（同フレーム中にまだ盤面から splice されていない状況は通常起きないが保険）
    if (destroyedIds.has(card.id)) return;

    // 直近関連アクション収集
    const relevant: RelevantActionSummary[] = [];
    for (let i = actions.length - 1; i >= 0 && relevant.length < 5; i--) {
      const act = actions[i];
      if (actionReferencesCard(act, card.id)) {
        relevant.push({
          sequence: act.sequence,
            type: act.type,
            summary: summarizeAction(act)
        });
      }
    }
    const lastCombatStage = actions
      .slice()
      .reverse()
      .find(a => a.type === 'combat_stage' && actionReferencesCard(a, card.id)) as Extract<GameAction,{type:'combat_stage'}> | undefined;

    const zones = collectDuplicatePresence(state, card.id);

    const totalHealthBase = card.health + card.healthModifier + card.passiveHealthModifier;
    const totalAttack = card.attack + card.attackModifier + card.passiveAttackModifier;

    const msgLines: string[] = [];
    msgLines.push('InvariantViolation: lingering dead creature (hp<=0) not destroyed');
    msgLines.push(` cardId=${card.id} name=${card.name} owner=${card.owner} pos=${card.position}`);
    msgLines.push(` health: current=${card.currentHealth} base=${card.health} mods(h=${card.healthModifier} ph=${card.passiveHealthModifier}) totalBase=${totalHealthBase}`);
    msgLines.push(` attack: base=${card.attack} mods(a=${card.attackModifier} pa=${card.passiveAttackModifier}) total=${totalAttack}`);
    if (card.statusEffects.length > 0) {
      const effStr = card.statusEffects.map(e => {
        if ((e as any).type === 'poison') { // eslint-disable-line @typescript-eslint/no-explicit-any
          const pe: any = e; // eslint-disable-line @typescript-eslint/no-explicit-any
          return `poison(dmg=${pe.damage},dur=${pe.duration})`;
        }
        return e.type;
      }).join(',');
      msgLines.push(` statusEffects: [${effStr}]`);
    } else {
      msgLines.push(' statusEffects: []');
    }
    msgLines.push(` phase=${state.phase} turn=${state.turnNumber} currentPlayer=${state.currentPlayer}`);
    msgLines.push(` lastCombatStage=${lastCombatStage ? lastCombatStage.data.stage : 'none'}`);
    msgLines.push(` duplicateIdPresence=${JSON.stringify(zones)}`);
    if (relevant.length > 0) {
      msgLines.push(' lastRelevantActions=[' + relevant.map(r => `#${r.sequence} ${r.summary}`).join(' | ') + ']');
    } else {
      msgLines.push(' lastRelevantActions=[]');
    }
    msgLines.push(` actionLog.length=${actions.length}`);
    msgLines.push(` deathInvariantVersion=${DEATH_INVARIANT_VERSION}`);

    const fullMessage = msgLines.join('\n');

    if (process.env.NODE_ENV !== 'production') {
      throw new Error(fullMessage);
    } else {
      // 本番環境: 取り急ぎログのみ（将来フラグ化可）
      // eslint-disable-next-line no-console
      console.error(fullMessage);
    }
  }

  state.players.player1.field.forEach(inspectCard);
  state.players.player2.field.forEach(inspectCard);
}

export const __invariantTestHooks = { summarizeAction, actionReferencesCard };
