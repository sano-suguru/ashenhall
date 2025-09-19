/**
 * Ashenhall 統一アクションシステム
 * 
 * 設計方針:
 * - 論理順序と演出順序の完全統一
 * - 環境別分岐の排除
 * - handleCreatureDeath等の既存関数置換
 */

import type {
  GameState,
  FieldCard,
  PlayerId,
  ValueChange,
} from '@/types/game';
import type {
  GameCommand,
  DamageCommand,
  DestroyCommand,
  HealCommand,
  BuffCommand,
  DebuffCommand,
  CommandExecutionResult,
  AnimationCommand,
  UnifiedActionConfig,
} from '@/types/commands';
import {
  addEffectTriggerAction,
  addCreatureDestroyedAction,
} from './action-logger';
import AnimationDurations, { getDurationForPhaseMs } from './animation-durations';
import { processEffectTrigger } from './card-effects';
// UUID代替手段：シンプルなランダムID生成
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * 統一アクションプロセッサー
 * 環境別分岐を完全排除し、論理と演出を統一管理
 */
export class UnifiedActionProcessor {
  private static config: UnifiedActionConfig = {
    isTestEnvironment: typeof window === 'undefined' || process.env.NODE_ENV === 'test',
    gameSpeed: 1.0,
    enableDebugLog: false,
  };

  /**
   * 設定更新
   */
  static updateConfig(newConfig: Partial<UnifiedActionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * コマンド実行（メインエントリーポイント）
   */
  static execute(
    commands: GameCommand[],
    state: GameState
  ): CommandExecutionResult {
    const result: CommandExecutionResult = {
      newGameState: { ...state },
      scheduledAnimations: [],
      executedCommandCount: 0,
      failedCommands: [],
    };

    try {
      // 1. コマンドを優先度順にソート
      const sortedCommands = this.sortCommandsByPriority(commands);
      
      // 2. 各コマンドを実行
      for (const command of sortedCommands) {
        try {
          const success = this.executeCommand(command, result.newGameState);
          if (success) {
            result.executedCommandCount++;
            
            // 3. アニメーション情報を記録（将来拡張用）
            if (!this.config.isTestEnvironment) {
              const animationCommand = this.createAnimationCommand(command);
              if (animationCommand) {
                result.scheduledAnimations.push(animationCommand);
              }
            }
          }
        } catch (error) {
          result.failedCommands.push({
            command,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      if (this.config.enableDebugLog) {
        console.log(`UnifiedActionProcessor: Executed ${result.executedCommandCount} commands`);
      }

      return result;
    } catch (error) {
      console.error('UnifiedActionProcessor.execute failed:', error);
      throw error;
    }
  }

  /**
   * 単一コマンド実行
   */
  private static executeCommand(command: GameCommand, state: GameState): boolean {
    switch (command.type) {
      case 'damage':
        return this.executeDamageCommand(command as DamageCommand, state);
      case 'destroy':
        return this.executeDestroyCommand(command as DestroyCommand, state);
      case 'heal':
        return this.executeHealCommand(command as HealCommand, state);
      case 'buff_attack':
      case 'buff_health':
        return this.executeBuffCommand(command as BuffCommand, state);
      case 'debuff_attack':
      case 'debuff_health':
        return this.executeDebuffCommand(command as DebuffCommand, state);
      default:
        console.warn(`Unknown command type: ${command.type}`);
        return false;
    }
  }

  /**
   * ダメージコマンド実行
   */
  private static executeDamageCommand(command: DamageCommand, state: GameState): boolean {
    const valueChanges: Record<string, ValueChange> = {};
    
    if (command.targetsPlayer) {
      // プレイヤーへのダメージ
      command.targetIds.forEach(playerId => {
        const player = state.players[playerId as PlayerId];
        if (player) {
          const before = player.life;
          player.life = Math.max(0, player.life - command.value);
          const after = player.life;
          valueChanges[playerId] = { life: { before, after } };
        }
      });
    } else {
      // カードへのダメージ
      command.targetIds.forEach(cardId => {
        const targetCard = this.findFieldCardById(state, cardId);
        if (targetCard) {
          const before = targetCard.currentHealth;
          targetCard.currentHealth = Math.max(0, targetCard.currentHealth - command.value);
          const after = targetCard.currentHealth;
          valueChanges[cardId] = { health: { before, after } };
        }
      });
    }

    // アクションログに記録
    addEffectTriggerAction(state, state.currentPlayer, {
      sourceCardId: command.sourceId,
      effectType: 'damage',
      effectValue: command.value,
      targets: valueChanges,
    });

    return true;
  }

  /**
   * 破壊コマンド実行（handleCreatureDeath置換）
   */
  private static executeDestroyCommand(command: DestroyCommand, state: GameState): boolean {
    const target = command.targetCard;
    const ownerId = target.owner;
    const player = state.players[ownerId];

    // 既に場からいなくなっている場合は処理しない
    const cardIndexOnField = player.field.findIndex(c => c.id === target.id);
    if (cardIndexOnField === -1) {
      return false;
    }

    // 破壊ログを記録
    addCreatureDestroyedAction(state, ownerId, {
      destroyedCardId: target.id,
      source: command.source,
      sourceCardId: command.sourceId,
    });

    // 死亡したカード自身の`on_death`効果を発動
    processEffectTrigger(state, "on_death", target, ownerId, target);

    // 場から取り除き、墓地へ送る
    const [removedCard] = player.field.splice(cardIndexOnField, 1);
    player.graveyard.push(removedCard);

    // 他の味方の`on_ally_death`効果を発動
    processEffectTrigger(state, "on_ally_death", undefined, ownerId, removedCard);

    // 場のカードの位置を再インデックス
    player.field.forEach((c, i) => (c.position = i));

    return true;
  }

  /**
   * 回復コマンド実行
   */
  private static executeHealCommand(command: HealCommand, state: GameState): boolean {
    const valueChanges: Record<string, ValueChange> = {};

    if (command.targetsPlayer) {
      // プレイヤーの回復
      command.targetIds.forEach(playerId => {
        const player = state.players[playerId as PlayerId];
        if (player) {
          const before = player.life;
          player.life += command.value;
          const after = player.life;
          valueChanges[playerId] = { life: { before, after } };
        }
      });
    } else {
      // カードの回復
      command.targetIds.forEach(cardId => {
        const targetCard = this.findFieldCardById(state, cardId);
        if (targetCard) {
          const maxHealth = targetCard.health + targetCard.healthModifier + targetCard.passiveHealthModifier;
          const before = targetCard.currentHealth;
          targetCard.currentHealth = Math.min(maxHealth, targetCard.currentHealth + command.value);
          const after = targetCard.currentHealth;
          valueChanges[cardId] = { health: { before, after } };
        }
      });
    }

    // アクションログに記録
    addEffectTriggerAction(state, state.currentPlayer, {
      sourceCardId: command.sourceId,
      effectType: 'heal',
      effectValue: command.value,
      targets: valueChanges,
    });

    return true;
  }

  /**
   * バフコマンド実行
   */
  private static executeBuffCommand(command: BuffCommand, state: GameState): boolean {
    const valueChanges: Record<string, ValueChange> = {};

    command.targetIds.forEach(cardId => {
      const targetCard = this.findFieldCardById(state, cardId);
      if (targetCard) {
        if (command.type === 'buff_attack') {
          const before = targetCard.attack + targetCard.attackModifier + targetCard.passiveAttackModifier;
          if (command.effectType === 'permanent') {
            targetCard.attackModifier += command.value;
          } else {
            targetCard.passiveAttackModifier += command.value;
          }
          const after = targetCard.attack + targetCard.attackModifier + targetCard.passiveAttackModifier;
          valueChanges[cardId] = { attack: { before, after } };
        } else if (command.type === 'buff_health') {
          const before = targetCard.health + targetCard.healthModifier + targetCard.passiveHealthModifier;
          if (command.effectType === 'permanent') {
            targetCard.healthModifier += command.value;
            targetCard.currentHealth += command.value; // 最大体力増加時は現在体力も増加
          } else {
            targetCard.passiveHealthModifier += command.value;
            targetCard.currentHealth += command.value;
          }
          const after = targetCard.health + targetCard.healthModifier + targetCard.passiveHealthModifier;
          valueChanges[cardId] = { health: { before, after } };
        }
      }
    });

    // アクションログに記録
    addEffectTriggerAction(state, state.currentPlayer, {
      sourceCardId: command.sourceId,
      effectType: command.type,
      effectValue: command.value,
      targets: valueChanges,
    });

    return true;
  }

  /**
   * デバフコマンド実行
   */
  private static executeDebuffCommand(command: DebuffCommand, state: GameState): boolean {
    const valueChanges: Record<string, ValueChange> = {};

    command.targetIds.forEach(cardId => {
      const targetCard = this.findFieldCardById(state, cardId);
      if (targetCard) {
        if (command.type === 'debuff_attack') {
          const before = targetCard.attack + targetCard.attackModifier + targetCard.passiveAttackModifier;
          targetCard.attackModifier -= command.value;
          const after = targetCard.attack + targetCard.attackModifier + targetCard.passiveAttackModifier;
          valueChanges[cardId] = { attack: { before, after } };
        } else if (command.type === 'debuff_health') {
          const before = targetCard.health + targetCard.healthModifier + targetCard.passiveHealthModifier;
          targetCard.healthModifier -= command.value;
          // 最大体力減少時は現在体力も調整
          const newMaxHealth = targetCard.health + targetCard.healthModifier + targetCard.passiveHealthModifier;
          targetCard.currentHealth = Math.min(targetCard.currentHealth, newMaxHealth);
          const after = targetCard.health + targetCard.healthModifier + targetCard.passiveHealthModifier;
          valueChanges[cardId] = { health: { before, after } };
        }
      }
    });

    // アクションログに記録
    addEffectTriggerAction(state, state.currentPlayer, {
      sourceCardId: command.sourceId,
      effectType: command.type,
      effectValue: command.value,
      targets: valueChanges,
    });

    return true;
  }

  /**
   * コマンド優先度ソート
   */
  private static sortCommandsByPriority(commands: GameCommand[]): GameCommand[] {
    return [...commands].sort((a, b) => {
      // 優先度が高いものから実行
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      // 同じ優先度の場合は依存関係を考慮
      return 0;
    });
  }

  /**
   * FieldCardをIDで検索
   */
  private static findFieldCardById(state: GameState, cardId: string): FieldCard | undefined {
    for (const playerId of ['player1', 'player2'] as PlayerId[]) {
      const found = state.players[playerId].field.find(card => card.id === cardId);
      if (found) return found;
    }
    return undefined;
  }

  /**
   * アニメーションコマンド作成
   */
  private static createAnimationCommand(command: GameCommand): AnimationCommand | null {
    if (this.config.isTestEnvironment) {
      return null; // テスト環境ではアニメーション無し
    }

  const baseDelay = 0;
  const baseDuration = AnimationDurations.ATTACK / this.config.gameSpeed; // keep attack short

    switch (command.type) {
      case 'damage':
        return {
          targetCardId: command.targetIds[0], // 最初のターゲット
          type: 'taking_damage',
          delay: baseDelay,
          duration: getDurationForPhaseMs('DAMAGE') / this.config.gameSpeed,
          sourceCommandId: command.id,
        };
      case 'destroy':
        return {
          targetCardId: command.targetIds[0],
          type: 'dying',
          delay: baseDelay,
          duration: getDurationForPhaseMs('DESTROY') / this.config.gameSpeed,
          sourceCommandId: command.id,
        };
      case 'heal':
        return {
          targetCardId: command.targetIds[0],
          type: 'healing',
          delay: baseDelay,
          duration: baseDuration,
          sourceCommandId: command.id,
        };
      default:
        return null;
    }
  }

}

/**
 * 便利関数群（既存コードからの移行用）
 */
export class UnifiedActionHelpers {
  /**
   * handleCreatureDeath置換関数
   */
  static scheduleCreatureDeath(
    state: GameState,
    deadCard: FieldCard,
    source: 'combat' | 'effect',
    sourceCardId: string
  ): void {
    const destroyCommand: DestroyCommand = {
      type: 'destroy',
      timing: 'immediate', // テスト互換性のため即座実行
      targetIds: [deadCard.id],
      value: 0,
      sourceId: sourceCardId,
      priority: 100,
      dependencies: [],
      id: generateId(),
      source,
      targetCard: deadCard,
    };

    UnifiedActionProcessor.execute([destroyCommand], state);
  }

  /**
   * ダメージ処理の便利関数
   */
  static scheduleDamage(
    state: GameState,
    targets: FieldCard[],
    damage: number,
    sourceCardId: string
  ): void {
    if (targets.length === 0) return;

    const damageCommand: DamageCommand = {
      type: 'damage',
      timing: 'immediate',
      targetIds: targets.map(t => t.id),
      value: damage,
      sourceId: sourceCardId,
      priority: 50,
      dependencies: [],
      id: generateId(),
      targetsPlayer: false,
    };

    UnifiedActionProcessor.execute([damageCommand], state);
    
    // ダメージ後の死亡判定
    targets.forEach(target => {
      if (target.currentHealth <= 0) {
        this.scheduleCreatureDeath(state, target, 'effect', sourceCardId);
      }
    });
  }
}
