/**
 * Ashenhall ゲームアクションログシステム
 * 
 * 設計方針:
 * - 型安全な統合アクションログ関数
 * - 重複コードの削除
 * - 決定論的なタイムスタンプ生成
 */

import type {
  GameState,
  GameAction,
  PlayerId,
  CardPlayActionData,
  CardAttackActionData,
  CreatureDestroyedActionData,
  EffectTriggerActionData,
  TriggerEventActionData,
  EnergyUpdateActionData,
  PhaseChangeActionData,
  KeywordTriggerActionData,
  CombatStageActionData,
  CardDrawActionData,
  EnergyRefillActionData,
  EndStageActionData,
} from "@/types/game";

/**
 * 統合アクションログ関数
 * 型安全性を保持しつつ、すべてのアクションタイプに対応
 */
export function addAction<T extends GameAction['type']>(
  state: GameState,
  playerId: PlayerId,
  type: T,
  data: Extract<GameAction, { type: T }>['data']
): void {
  const action: GameAction = {
    sequence: state.actionLog.length,
    playerId,
    type,
    data,
    timestamp: Date.now(),
  } as GameAction;
  
  state.actionLog.push(action);
}

/**
 * 型安全なヘルパー関数群
 * 既存コードとの互換性を保持
 */
export function addCardPlayAction(
  state: GameState,
  playerId: PlayerId,
  data: CardPlayActionData
): void {
  addAction(state, playerId, "card_play", data);
}

export function addCardAttackAction(
  state: GameState,
  playerId: PlayerId,
  data: CardAttackActionData
): void {
  addAction(state, playerId, "card_attack", data);
}

export function addCreatureDestroyedAction(
  state: GameState,
  playerId: PlayerId,
  data: CreatureDestroyedActionData
): void {
  // 既に cardSnapshot が無ければ生成（呼び出し元が付与するケースも許容）
  if (!data.cardSnapshot) {
    // 盤面上から対象カードを探索（除去前である想定）
    const player = state.players[playerId];
    const found = player.field.find(c => c.templateId === data.destroyedCardId)
      || state.players[playerId === 'player1' ? 'player2' : 'player1'].field.find(c => c.templateId === data.destroyedCardId);
    if (found) {
      data.cardSnapshot = {
        id: found.templateId,
        owner: found.owner,
        name: found.name,
        attackTotal: found.attack + found.attackModifier + found.passiveAttackModifier,
        healthTotal: found.health + found.healthModifier + found.passiveHealthModifier,
        currentHealth: found.currentHealth,
        baseAttack: found.attack,
        baseHealth: found.health,
        keywords: [...(found.keywords || [])],
      };
    }
  }
  addAction(state, playerId, "creature_destroyed", data);
}

export function addEffectTriggerAction(
  state: GameState,
  playerId: PlayerId,
  data: EffectTriggerActionData
): void {
  addAction(state, playerId, "effect_trigger", data);
}

export function addTriggerEventAction(
  state: GameState,
  playerId: PlayerId,
  data: TriggerEventActionData
): void {
  addAction(state, playerId, "trigger_event", data);
}

export function addEnergyUpdateAction(
  state: GameState,
  playerId: PlayerId,
  data: EnergyUpdateActionData
): void {
  addAction(state, playerId, "energy_update", data);
}

export function addPhaseChangeAction(
  state: GameState,
  playerId: PlayerId,
  data: PhaseChangeActionData
): void {
  addAction(state, playerId, "phase_change", data);
}

export function addKeywordTriggerAction(
  state: GameState,
  playerId: PlayerId,  
  data: KeywordTriggerActionData
): void {
  addAction(state, playerId, "keyword_trigger", data);
}

export function addCombatStageAction(
  state: GameState,
  playerId: PlayerId,
  data: CombatStageActionData
): void {
  addAction(state, playerId, 'combat_stage', data);
}

export function addCardDrawAction(
  state: GameState,
  playerId: PlayerId,
  data: CardDrawActionData
): void {
  addAction(state, playerId, 'card_draw', data);
}

export function addEnergyRefillAction(
  state: GameState,
  playerId: PlayerId,
  data: EnergyRefillActionData
): void {
  addAction(state, playerId, 'energy_refill', data);
}

export function addEndStageAction(
  state: GameState,
  playerId: PlayerId,
  data: EndStageActionData
): void {
  addAction(state, playerId, 'end_stage', data);
}
