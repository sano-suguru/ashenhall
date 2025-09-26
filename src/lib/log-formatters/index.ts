import type { GameAction, GameState, LogDisplayParts, PlayerId } from "@/types/game";
import { getCardName, getPlayerName } from "../game-state-utils";

type LogFormatter = (action: GameAction, playerName: string, gameState: GameState) => LogDisplayParts;

// === 統合されたログフォーマッター実装 ===

function formatCardAttackLog(action: GameAction, playerName: string): LogDisplayParts {
  if (action.type !== 'card_attack') throw new Error('Invalid action type for formatCardAttackLog');

  const { data } = action;
  const attackerName = getCardName(data.attackerCardId);
  const isPlayerTarget = data.targetId === "player1" || data.targetId === "player2";
  const targetName = isPlayerTarget ? getPlayerName(data.targetId as PlayerId) : `《${getCardName(data.targetId)}》`;
  
  let details = `(${data.damage}ダメージ)`;
  if (data.targetHealth) {
    details += ` 体力 ${data.targetHealth.before}→${data.targetHealth.after}`;
  } else if (data.targetPlayerLife) {
    details += ` ライフ ${data.targetPlayerLife.before}→${data.targetPlayerLife.after}`;
  }

  return {
    type: 'card_attack',
    iconName: 'Swords',
    playerName,
    message: `《${attackerName}》 → ${targetName}`,
    details: details,
    cardIds: [data.attackerCardId, data.targetId],
  };
}

function formatCardPlayLog(action: GameAction, playerName: string): LogDisplayParts {
  if (action.type !== 'card_play') throw new Error('Invalid action type for formatCardPlayLog');

  const { data } = action;
  const cardName = getCardName(data.cardId);
  const energyChange = data.playerEnergy 
    ? ` (エネルギー ${data.playerEnergy.before}→${data.playerEnergy.after})`
    : '';

  return {
    type: 'card_play',
    iconName: 'Plus',
    playerName,
    message: `《${cardName}》を場に出した`,
    details: `位置:${data.position}${energyChange}`,
    cardIds: [data.cardId],
  };
}

function formatCreatureDestroyedLog(action: GameAction, playerName: string): LogDisplayParts {
  if (action.type !== 'creature_destroyed') throw new Error('Invalid action type for formatCreatureDestroyedLog');

  const { data } = action;
  const cardName = getCardName(data.destroyedCardId);
  const sourceText = data.source === 'combat' 
    ? '戦闘によって'
    : data.sourceCardId 
      ? `《${getCardName(data.sourceCardId)}》によって`
      : '効果によって';

  return {
    type: 'creature_destroyed',
    iconName: 'Skull',
    playerName,
    message: `《${cardName}》が${sourceText}破壊された`,
    cardIds: data.sourceCardId ? [data.destroyedCardId, data.sourceCardId] : [data.destroyedCardId],
  };
}

function formatEffectTriggerLog(action: GameAction, playerName: string): LogDisplayParts {
  if (action.type !== 'effect_trigger') throw new Error('Invalid action type for formatEffectTriggerLog');

  const { data } = action;
  const sourceName = typeof data.sourceCardId === 'string' 
    ? `《${getCardName(data.sourceCardId)}》`
    : data.sourceCardId; // system source のまま表示
  
  const targetCount = Object.keys(data.targets).length;
  const effectName = data.effectType === 'damage' ? 'ダメージ' 
                   : data.effectType === 'heal' ? '回復'
                   : data.effectType;

  return {
    type: 'effect_trigger',
    iconName: 'Zap',
    playerName,
    message: `${sourceName}の効果で${targetCount}体に${effectName}(${data.effectValue})`,
    cardIds: typeof data.sourceCardId === 'string' ? [data.sourceCardId] : [],
  };
}

function formatEnergyUpdateLog(action: GameAction, playerName: string): LogDisplayParts {
  if (action.type !== 'energy_update') throw new Error('Invalid action type for formatEnergyUpdateLog');

  const { data } = action;
  return {
    type: 'energy_update',
    iconName: 'Zap',
    playerName,
    message: `最大エネルギーが${data.maxEnergyBefore}から${data.maxEnergyAfter}に変化`,
    cardIds: [],
  };
}

function formatKeywordTriggerLog(action: GameAction, playerName: string): LogDisplayParts {
  if (action.type !== 'keyword_trigger') throw new Error('Invalid action type for formatKeywordTriggerLog');

  const { data } = action;
  const sourceName = getCardName(data.sourceCardId);
  const targetName = data.targetId.startsWith('player') 
    ? getPlayerName(data.targetId as PlayerId)
    : `《${getCardName(data.targetId)}》`;

  return {
    type: 'keyword_trigger',
    iconName: 'Star',
    playerName,
    message: `《${sourceName}》の${data.keyword}が発動 → ${targetName} (${data.value})`,
    cardIds: [data.sourceCardId, data.targetId],
  };
}

function formatPhaseChangeLog(action: GameAction, playerName: string): LogDisplayParts {
  if (action.type !== 'phase_change') throw new Error('Invalid action type for formatPhaseChangeLog');

  const { data } = action;
  const phaseNames: Record<string, string> = {
    draw: 'ドロー',
    energy: 'エネルギー',
    deploy: '展開',
    battle: '戦闘',
    battle_attack: '攻撃',
    end: '終了',
  };

  const fromPhaseName = phaseNames[data.fromPhase] || data.fromPhase;
  const toPhaseName = phaseNames[data.toPhase] || data.toPhase;

  return {
    type: 'phase_change',
    iconName: 'ArrowRight',
    playerName,
    message: `${fromPhaseName}フェーズ → ${toPhaseName}フェーズ`,
    cardIds: [],
  };
}

function formatTriggerEventLog(action: GameAction, playerName: string): LogDisplayParts {
  if (action.type !== 'trigger_event') throw new Error('Invalid action type for formatTriggerEventLog');

  const { data } = action;
  const sourceName = data.sourceCardId ? `《${getCardName(data.sourceCardId)}》` : 'システム';
  const targetText = data.targetCardId ? ` → 《${getCardName(data.targetCardId)}》` : '';

  return {
    type: 'trigger_event',
    iconName: 'Sparkles',
    playerName,
    message: `${sourceName}の${data.triggerType}トリガー${targetText}`,
    cardIds: [data.sourceCardId, data.targetCardId].filter(Boolean) as string[],
  };
}

// 仮フォーマッタ（詳細仕様未定のため簡易）
function formatCardDrawLog(action: GameAction, playerName: string): LogDisplayParts {
  if (action.type !== 'card_draw') throw new Error('invalid type');
  return {
    type: 'card_draw',
    iconName: 'FilePlus',
    playerName,
    message: `カードをドロー (${action.data.handSizeBefore}->${action.data.handSizeAfter})`,
    details: action.data.fatigue ? `疲労:${action.data.fatigue.lifeBefore}->${action.data.fatigue.lifeAfter}` : undefined,
    cardIds: [action.data.cardId]
  };
}

function formatEnergyRefillLog(action: GameAction, playerName: string): LogDisplayParts {
  if (action.type !== 'energy_refill') throw new Error('invalid type');
  return {
    type: 'energy_refill',
    iconName: 'BatteryCharging',
    playerName,
    message: `エネルギー回復 ${action.data.energyBefore}->${action.data.energyAfter}`,
    details: `最大:${action.data.maxEnergy}`,
    cardIds: []
  };
}

function formatEndStageLog(action: GameAction, playerName: string): LogDisplayParts {
  if (action.type !== 'end_stage') throw new Error('invalid type');
  return {
    type: 'end_stage',
    iconName: 'Clock',
    playerName,
    message: `EndStage:${action.data.stage}`,
    cardIds: []
  };
}

// combat_stage 用の簡易フォーマッタ（暫定: UI は主に card_attack / creature_destroyed を詳細表示）
function formatCombatStageLog(action: GameAction, playerName: string): LogDisplayParts {
  if (action.type !== 'combat_stage') throw new Error('Invalid action type for combat_stage formatter');
  const stage = action.data.stage;
  const attacker = action.data.attackerId;
  const target = action.data.targetId ?? 'player';
  return {
    type: 'combat_stage',
    iconName: 'Swords',
    playerName,
    message: `[${stage}] ${attacker} -> ${target}`,
    cardIds: [attacker, ...(action.data.targetId ? [action.data.targetId] : [])]
  };
}

export const logFormatters: Record<GameAction['type'], LogFormatter> = {
  energy_update: formatEnergyUpdateLog,
  card_play: formatCardPlayLog,
  card_attack: formatCardAttackLog,
  creature_destroyed: formatCreatureDestroyedLog,
  effect_trigger: formatEffectTriggerLog,
  phase_change: formatPhaseChangeLog,
  trigger_event: formatTriggerEventLog,
  keyword_trigger: formatKeywordTriggerLog,
  combat_stage: formatCombatStageLog,
  card_draw: formatCardDrawLog,
  energy_refill: formatEnergyRefillLog,
  end_stage: formatEndStageLog,
};
