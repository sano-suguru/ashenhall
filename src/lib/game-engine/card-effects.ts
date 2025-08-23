/**
 * カード効果処理システム
 *
 * 設計方針:
 * - 各効果を独立したテスト可能な関数として実装
 * - エラーハンドリングを全箇所で実装
 * - 決定論的な効果処理（同条件なら同結果）
 */

import type {
  GameState,
  Card,
  FieldCard,
  CardEffect,
  PlayerId,
  EffectAction,
  EffectTarget,
  GameAction,
  ValueChange,
  TriggerEventActionData,
  EffectTrigger,
  CreatureDestroyedActionData,
} from "@/types/game";

/**
 * 決定論的乱数生成器（ゲームエンジンコアと同じ実装）
 */
class SeededRandom {
  private seed: number;

  constructor(seed: string) {
    this.seed = this.hashCode(seed);
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  choice<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    return array[this.nextInt(0, array.length)];
  }
}

/**
 * 効果ログを追加
 */
function addEffectTriggerAction(
  state: GameState,
  sourceCardId: string,
  effectType: EffectAction,
  effectValue: number,
  targets: Record<string, ValueChange>
): void {
  const action: GameAction = {
    sequence: state.actionLog.length,
    playerId: state.currentPlayer,
    type: "effect_trigger",
    data: {
      sourceCardId,
      effectType,
      effectValue,
      targets,
    },
    timestamp: Date.now(),
  };
  state.actionLog.push(action);
}

/**
 * トリガーイベントログを追加
 */
function addTriggerEventAction(
  state: GameState,
  playerId: PlayerId,
  data: TriggerEventActionData
): void {
  const action: GameAction = {
    sequence: state.actionLog.length,
    playerId,
    type: "trigger_event",
    data,
    timestamp: Date.now(),
  };
  state.actionLog.push(action);
}

/**
 * 破壊ログを追加
 */
function addCreatureDestroyedAction(
  state: GameState,
  playerId: PlayerId,
  data: CreatureDestroyedActionData
): void {
  const action: GameAction = {
    sequence: state.actionLog.length,
    playerId,
    type: "creature_destroyed",
    data,
    timestamp: Date.now(),
  };
  state.actionLog.push(action);
}

/**
 * クリーチャー死亡処理を一元化
 */
export function handleCreatureDeath(
  state: GameState,
  deadCard: FieldCard,
  source: 'combat' | 'effect',
  sourceCardId: string
): void {
  const ownerId = deadCard.owner;
  const player = state.players[ownerId];

  // 既に場からいなくなっている場合は処理しない
  const cardIndexOnField = player.field.findIndex(c => c.id === deadCard.id);
  if (cardIndexOnField === -1) {
    return;
  }

  // 破壊ログを記録
  addCreatureDestroyedAction(state, ownerId, {
    destroyedCardId: deadCard.id,
    source,
    sourceCardId,
  });

  // 死亡したカード自身の`on_death`効果を発動
  processEffectTrigger(state, "on_death", deadCard, ownerId, deadCard);

  // 場から取り除き、墓地へ送る
  const [removedCard] = player.field.splice(cardIndexOnField, 1);
  player.graveyard.push(removedCard);

  // 他の味方の`on_ally_death`効果を発動
  player.field.forEach((allyCard) => {
    processEffectTrigger(state, "on_ally_death", allyCard, ownerId, removedCard);
  });

  // 場のカードの位置を再インデックス
  player.field.forEach((c, i) => (c.position = i));
}

/**
 * 対象選択ロジック
 */
function selectTargets(
  state: GameState,
  sourcePlayerId: PlayerId,
  targetType: EffectTarget,
  random: SeededRandom
): FieldCard[] {
  const sourcePlayer = state.players[sourcePlayerId];
  const opponentId: PlayerId =
    sourcePlayerId === "player1" ? "player2" : "player1";
  const opponent = state.players[opponentId];

  switch (targetType) {
    case "self":
      // 効果発動者自身は特別処理が必要（場にいない可能性）
      return [];

    case "ally_all":
      return [...sourcePlayer.field].filter((card) => card.currentHealth > 0);

    case "enemy_all":
      return [...opponent.field].filter((card) => card.currentHealth > 0);

    case "ally_random":
      const allyTargets = sourcePlayer.field.filter(
        (card) => card.currentHealth > 0
      );
      const randomAlly = random.choice(allyTargets);
      return randomAlly ? [randomAlly] : [];

    case "enemy_random":
      const enemyTargets = opponent.field.filter(
        (card) => card.currentHealth > 0
      );
      const randomEnemy = random.choice(enemyTargets);
      return randomEnemy ? [randomEnemy] : [];

    case "player":
      // プレイヤー対象は別処理
      return [];

    default:
      return [];
  }
}

/**
 * ダメージ効果の処理
 */
function applyDamage(
  state: GameState,
  targets: FieldCard[],
  targetPlayerId: PlayerId | null,
  damage: number,
  sourceCardId: string
): void {
  const valueChanges: Record<string, ValueChange> = {};

  targets.forEach((target) => {
    const before = target.currentHealth;
    target.currentHealth = Math.max(0, target.currentHealth - damage);
    const after = target.currentHealth;
    valueChanges[target.id] = { health: { before, after } };
  });

  if (targetPlayerId) {
    const player = state.players[targetPlayerId];
    const before = player.life;
    player.life = Math.max(0, player.life - damage);
    const after = player.life;
    valueChanges[targetPlayerId] = { life: { before, after } };
  }

  addEffectTriggerAction(state, sourceCardId, "damage", damage, valueChanges);

  // ダメージ適用後に死亡判定
  targets.forEach((target) => {
    if (target.currentHealth <= 0) {
      handleCreatureDeath(state, target, 'effect', sourceCardId);
    }
  });
}

/**
 * 回復効果の処理
 */
function applyHeal(
  state: GameState,
  targets: FieldCard[],
  targetPlayerId: PlayerId | null,
  healing: number,
  sourceCardId: string
): void {
  const valueChanges: Record<string, ValueChange> = {};

  targets.forEach((target) => {
    const maxHealth =
      target.health + target.healthModifier + target.passiveHealthModifier;
    const before = target.currentHealth;
    target.currentHealth = Math.min(maxHealth, target.currentHealth + healing);
    const after = target.currentHealth;
    valueChanges[target.id] = { health: { before, after } };
  });

  if (targetPlayerId) {
    const player = state.players[targetPlayerId];
    const before = player.life;
    player.life += healing;
    const after = player.life;
    valueChanges[targetPlayerId] = { life: { before, after } };
  }

  addEffectTriggerAction(state, sourceCardId, "heal", healing, valueChanges);
}

/**
 * バフ効果の処理
 */
function applyBuff(
  state: GameState,
  targets: FieldCard[],
  buffType: "attack" | "health",
  value: number,
  sourceCardId: string
): void {
  const valueChanges: Record<string, ValueChange> = {};

  targets.forEach((target) => {
    if (buffType === "attack") {
      const before =
        target.attack + target.attackModifier + target.passiveAttackModifier;
      target.attackModifier += value;
      const after =
        target.attack + target.attackModifier + target.passiveAttackModifier;
      valueChanges[target.id] = { attack: { before, after } };
    } else {
      const before = target.currentHealth;
      target.healthModifier += value;
      target.currentHealth += value;
      const after = target.currentHealth;
      valueChanges[target.id] = { health: { before, after } };
    }
  });

  const effectType = buffType === "attack" ? "buff_attack" : "buff_health";
  addEffectTriggerAction(state, sourceCardId, effectType, value, valueChanges);
}

/**
 * デバフ効果の処理
 */
function applyDebuff(
  state: GameState,
  targets: FieldCard[],
  debuffType: "attack" | "health",
  value: number,
  sourceCardId: string
): void {
  const valueChanges: Record<string, ValueChange> = {};

  targets.forEach((target) => {
    if (debuffType === "attack") {
      const before =
        target.attack + target.attackModifier + target.passiveAttackModifier;
      target.attackModifier = Math.max(
        -target.attack,
        target.attackModifier - value
      );
      const after =
        target.attack + target.attackModifier + target.passiveAttackModifier;
      valueChanges[target.id] = { attack: { before, after } };
    } else {
      const before = target.currentHealth;
      target.healthModifier -= value;
      const maxHealth =
        target.health + target.healthModifier + target.passiveHealthModifier;
      if (target.currentHealth > maxHealth) {
        target.currentHealth = maxHealth;
      }
      const after = target.currentHealth;
      valueChanges[target.id] = { health: { before, after } };
    }
  });

  const effectType =
    debuffType === "attack" ? "debuff_attack" : "debuff_health";
  addEffectTriggerAction(state, sourceCardId, effectType, value, valueChanges);
}

/**
 * トークン召喚効果の処理
 */
function applySummon(
  state: GameState,
  sourcePlayerId: PlayerId,
  sourceCardId: string,
  random: SeededRandom, // 決定論的乱数生成器を追加
  tokenStats?: { name?: string; attack: number; health: number }
): void {
  const player = state.players[sourcePlayerId];

  // 場が満杯の場合は召喚できない
  if (player.field.length >= 5) {
    return;
  }

  // 基本的なトークン（スケルトン・ウォリアー風）を召喚
  const token: FieldCard = {
    id: `token-${state.turnNumber}-${random.next()}`, // 決定論的なID生成
    owner: sourcePlayerId,
    name: tokenStats?.name || "トークン",
    type: "creature",
    faction: player.faction,
    cost: 0,
    attack: tokenStats?.attack ?? 1,
    health: tokenStats?.health ?? 1,
    keywords: [],
    currentHealth: tokenStats?.health ?? 1,
    attackModifier: 0,
    healthModifier: 0,
    passiveAttackModifier: 0,
    passiveHealthModifier: 0,
    effects: [],
    summonTurn: state.turnNumber,
    position: player.field.length,
    hasAttacked: false,
    isStealthed: false,
    isSilenced: false,
    statusEffects: [],
  };

  player.field.push(token);
  addEffectTriggerAction(state, sourceCardId, "summon", 1, { [token.id]: {} });
}

/**
 * カードドロー効果の処理
 */
function applyDrawCard(
  state: GameState,
  targetPlayerId: PlayerId,
  drawCount: number,
  sourceCardId: string
): void {
  const player = state.players[targetPlayerId];

  for (let i = 0; i < drawCount; i++) {
    // 手札上限チェック
    if (player.hand.length >= 7) {
      break;
    }

    // デッキからドロー
    if (player.deck.length > 0) {
      const drawnCard = player.deck.pop()!;
      player.hand.push(drawnCard);
    } else {
      // デッキ切れダメージ
      player.life = Math.max(0, player.life - 1);
    }
  }

  addEffectTriggerAction(state, sourceCardId, "draw_card", drawCount, {
    [targetPlayerId]: {},
  });
}

/**
 * 蘇生効果の処理
 */
function applyResurrect(
  state: GameState,
  sourcePlayerId: PlayerId,
  targetCardIds: string[],
  sourceCardId: string,
  random: SeededRandom
): void {
  const player = state.players[sourcePlayerId];

  for (const cardId of targetCardIds) {
    if (player.field.length >= 5) break;

    const graveyardIndex = player.graveyard.findIndex((c) => c.id === cardId);
    if (graveyardIndex === -1) continue;

    const [resurrectedCard] = player.graveyard.splice(graveyardIndex, 1);
    if (resurrectedCard.type !== "creature") continue;

    const newFieldCard: FieldCard = {
      ...resurrectedCard,
      owner: sourcePlayerId,
      currentHealth: resurrectedCard.health,
      attackModifier: 0,
      healthModifier: 0,
      passiveAttackModifier: 0,
      passiveHealthModifier: 0,
      summonTurn: state.turnNumber,
      position: player.field.length,
      hasAttacked: true,
      isStealthed: false,
      isSilenced: false,
      statusEffects: [],
    };

    player.field.push(newFieldCard);
    addEffectTriggerAction(state, sourceCardId, "resurrect", 1, {
      [newFieldCard.id]: {},
    });
  }
}

/**
 * 沈黙効果の処理
 */
function applySilence(
  state: GameState,
  targets: FieldCard[],
  sourceCardId: string
): void {
  const valueChanges: Record<string, ValueChange> = {};
  targets.forEach((target) => {
    target.isSilenced = true;
    valueChanges[target.id] = {};
  });
  addEffectTriggerAction(state, sourceCardId, "silence", 1, valueChanges);
}

/**
 * スタン効果の処理
 */
function applyStun(
  state: GameState,
  targets: FieldCard[],
  duration: number,
  sourceCardId: string
): void {
  targets.forEach((target) => {
    const existingStun = target.statusEffects.find((e) => e.type === "stun");
    if (existingStun) {
      existingStun.duration = Math.max(existingStun.duration, duration);
    } else {
      target.statusEffects.push({ type: "stun", duration });
    }
  });
  const valueChanges: Record<string, ValueChange> = {};
  targets.forEach((target) => {
    valueChanges[target.id] = {};
  });
  addEffectTriggerAction(state, sourceCardId, "stun", duration, valueChanges);
}

/**
 * デッキトップ破壊効果の処理
 */
function applyDestroyDeckTop(
  state: GameState,
  sourcePlayerId: PlayerId,
  costThreshold: number,
  sourceCardId: string
): void {
  const opponentId: PlayerId =
    sourcePlayerId === "player1" ? "player2" : "player1";
  const opponent = state.players[opponentId];

  if (opponent.deck.length > 0) {
    const topCard = opponent.deck[opponent.deck.length - 1];
    if (topCard.cost >= costThreshold) {
      const destroyedCard = opponent.deck.pop()!;
      opponent.graveyard.push(destroyedCard);
      addEffectTriggerAction(
        state,
        sourceCardId,
        "destroy_deck_top",
        destroyedCard.cost,
        { [opponentId]: {} }
      );
    }
  }
}

/**
 * 攻撃力と体力を入れ替える効果の処理
 */
function applySwapAttackHealth(
  state: GameState,
  targets: FieldCard[],
  sourceCardId: string
): void {
  const valueChanges: Record<string, ValueChange> = {};
  targets.forEach((target) => {
    const oldAttack =
      target.attack + target.attackModifier + target.passiveAttackModifier;
    const oldHealth =
      target.health + target.healthModifier + target.passiveHealthModifier;
    const oldCurrentHealth = target.currentHealth;

    // Swap base stats
    const tempBaseAttack = target.attack;
    target.attack = target.health;
    target.health = tempBaseAttack;

    // Reset modifiers and apply new ones to match the swapped values
    target.attackModifier = 0;
    target.healthModifier = 0;
    target.passiveAttackModifier = 0;
    target.passiveHealthModifier = 0;

    const newBaseAttack = target.attack;
    const newBaseHealth = target.health;

    target.attackModifier = oldHealth - newBaseAttack;
    target.healthModifier = oldAttack - newBaseHealth;

    // Adjust current health proportionally
    const healthRatio = oldHealth > 0 ? oldCurrentHealth / oldHealth : 0;
    target.currentHealth = Math.ceil(
      (newBaseHealth + target.healthModifier) * healthRatio
    );

    const newAttack =
      target.attack + target.attackModifier + target.passiveAttackModifier;
    const newCurrentHealth = target.currentHealth;

    valueChanges[target.id] = {
      attack: { before: oldAttack, after: newAttack },
      health: { before: oldCurrentHealth, after: newCurrentHealth },
    };
  });
  addEffectTriggerAction(
    state,
    sourceCardId,
    "swap_attack_health",
    1,
    valueChanges
  );
}

/**
 * 手札破壊効果の処理
 */
function applyHandDiscard(
  state: GameState,
  targetPlayerId: PlayerId,
  count: number,
  sourceCardId: string,
  random: SeededRandom,
  filter?: import("@/types/game").TargetFilter
): void {
  const player = state.players[targetPlayerId];
  if (player.hand.length === 0) return;

  for (let i = 0; i < count; i++) {
    let potentialTargets = player.hand;

    if (filter) {
      potentialTargets = potentialTargets.filter((card) => {
        // @ts-expect-error: filter.property is a dynamic key, but it's safe because CardProperty type ensures it exists on Card.
        return card[filter.property] === filter.value;
      });
    }

    if (potentialTargets.length === 0) return;

    const cardToDiscard = random.choice(potentialTargets);
    if (cardToDiscard) {
      player.hand = player.hand.filter((c) => c.id !== cardToDiscard.id);
      player.graveyard.push(cardToDiscard);
      addEffectTriggerAction(state, sourceCardId, "hand_discard", 1, {
        [targetPlayerId]: {},
      });
    }
  }
}

/**
 * 全クリーチャー破壊効果の処理
 */
function applyDestroyAllCreatures(
  state: GameState,
  sourceCardId: string
): void {
  const valueChanges: Record<string, ValueChange> = {};
  const targets: FieldCard[] = [];
  state.players.player1.field.forEach((c) => targets.push(c));
  state.players.player2.field.forEach((c) => targets.push(c));

  targets.forEach((target) => {
    const before = target.currentHealth;
    target.currentHealth = 0;
    valueChanges[target.id] = { health: { before, after: 0 } };
  });

  addEffectTriggerAction(
    state,
    sourceCardId,
    "destroy_all_creatures",
    1,
    valueChanges
  );
}

/**
 * 効果の発動条件を判定する
 */
function checkEffectCondition(
  state: GameState,
  sourcePlayerId: PlayerId,
  condition: import("@/types/game").EffectCondition | undefined
): boolean {
  if (!condition) {
    return true; // 条件がなければ常にtrue
  }

  const player = state.players[sourcePlayerId];
  const opponent =
    state.players[sourcePlayerId === "player1" ? "player2" : "player1"];

  let subjectValue: number;

  switch (condition.subject) {
    case "graveyard":
      subjectValue = player.graveyard.length;
      break;
    case "allyCount":
      subjectValue = player.field.length;
      break;
    case "playerLife":
      subjectValue = player.life;
      break;
    case "opponentLife":
      subjectValue = opponent.life;
      break;
    default:
      return true; // 不明な subject は true
  }

  const compareValue =
    condition.value === "opponentLife" ? opponent.life : condition.value;

  switch (condition.operator) {
    case "gte":
      return subjectValue >= compareValue;
    case "lte":
      return subjectValue <= compareValue;
    case "lt":
      return subjectValue < compareValue;
    case "gt":
      return subjectValue > compareValue;
    case "eq":
      return subjectValue === compareValue;
    default:
      return true; // 不明な operator は true
  }
}

/**
 * 単一カード効果の実行
 */
export function executeCardEffect(
  state: GameState,
  effect: CardEffect,
  sourceCard: Card,
  sourcePlayerId: PlayerId
): void {
  try {
    const random = new SeededRandom(
      state.randomSeed + state.turnNumber + sourceCard.id
    );
    let targets = selectTargets(state, sourcePlayerId, effect.target, random);
    let value = effect.value;
    const sourcePlayer = state.players[sourcePlayerId];
    const opponentId: PlayerId =
      sourcePlayerId === "player1" ? "player2" : "player1";

    // --- 動的な効果値や対象を解決 ---
    if (
      sourceCard.id === "necro_grave_giant" &&
      effect.action === "buff_attack"
    ) {
      value = sourcePlayer.graveyard.filter(
        (c) => c.type === "creature"
      ).length;
    }
    if (sourceCard.id === "kni_sanctuary_prayer" && effect.action === "heal") {
      value = sourcePlayer.field.filter((c) => c.currentHealth > 0).length;
    }
    if (
      sourceCard.id === "kni_white_wing_marshal" &&
      effect.target === "ally_all"
    ) {
      targets = targets.filter((t) => t.id !== sourceCard.id); // 自分自身を除く
    }

    if (effect.target === "self" && sourceCard.type === "creature") {
      const fieldCard = state.players[sourcePlayerId].field.find(
        (c) => c.id === sourceCard.id
      );
      if (fieldCard) {
        targets = [fieldCard];
      }
    }

    switch (effect.action) {
      case "damage":
        // 特殊効果: 秘術の連雷
        if (sourceCard.id === "mag_arcane_lightning") {
          const initialTarget = random.choice(
            state.players[opponentId].field.filter((c) => c.currentHealth > 0)
          );
          if (initialTarget) {
            const initialHealth = initialTarget.currentHealth;
            applyDamage(state, [initialTarget], null, value, sourceCard.id);
            if (initialTarget.currentHealth <= 0 && initialHealth > 0) {
              // 死亡した場合
              const secondaryTarget = random.choice(
                state.players[opponentId].field.filter(
                  (c) => c.currentHealth > 0 && c.id !== initialTarget.id
                )
              );
              if (secondaryTarget) {
                applyDamage(state, [secondaryTarget], null, 2, sourceCard.id);
              }
            }
          }
        } else if (effect.target === "player") {
          applyDamage(state, [], opponentId, value, sourceCard.id);
        } else {
          applyDamage(state, targets, null, value, sourceCard.id);
        }
        break;

      case "heal":
        if (effect.target === "player") {
          applyHeal(state, [], sourcePlayerId, value, sourceCard.id);
        } else {
          applyHeal(state, targets, null, value, sourceCard.id);
        }
        break;

      case "buff_attack":
        if (effect.trigger === "passive") {
          targets.forEach((target) => {
            target.passiveAttackModifier += value;
          });
          // パッシブ効果のログ記録を削除
        } else {
          applyBuff(state, targets, "attack", value, sourceCard.id);
        }
        break;

      case "buff_health":
        if (effect.trigger === "passive") {
          targets.forEach((target) => {
            target.passiveHealthModifier += value;
            target.currentHealth += value;
          });
          // パッシブ効果のログ記録を削除
        } else {
          applyBuff(state, targets, "health", value, sourceCard.id);
        }
        break;

      case "debuff_attack":
        applyDebuff(state, targets, "attack", value, sourceCard.id);
        break;

      case "debuff_health":
        applyDebuff(state, targets, "health", value, sourceCard.id);
        break;

      case "summon":
        if (sourceCard.id === "necro_soul_vortex") {
          // 効果解決前に、自身を墓地から一時的に除外してカウントする
          const spellCardIndex = sourcePlayer.graveyard.findIndex(
            (c) => c.id === sourceCard.id
          );
          if (spellCardIndex > -1) {
            sourcePlayer.graveyard.splice(spellCardIndex, 1);
          }
          const graveyardSize = sourcePlayer.graveyard.length;
          sourcePlayer.graveyard = []; // 残りの墓地をゲームから除外
          applySummon(state, sourcePlayerId, sourceCard.id, random, {
            name: "魂の集合体",
            attack: graveyardSize,
            health: graveyardSize,
          });
        } else {
          applySummon(state, sourcePlayerId, sourceCard.id, random);
        }
        break;

      case "draw_card":
        applyDrawCard(state, sourcePlayerId, value, sourceCard.id);
        break;

      case "silence":
        applySilence(state, targets, sourceCard.id);
        break;

      case "resurrect":
        // 特殊効果: 魂の供物
        if (sourceCard.id === "necro_soul_offering") {
          const allies = sourcePlayer.field.filter((c) => c.currentHealth > 0);
          if (allies.length > 0) {
            const sacrifice = random.choice(allies)!;
            sacrifice.currentHealth = 0; // 死亡させる
          }
          const resurrectTargets = sourcePlayer.graveyard.filter(
            (c) => c.type === "creature" && c.cost <= value
          );
          if (resurrectTargets.length > 0) {
            const toResurrect = random.choice(resurrectTargets)!;
            applyResurrect(
              state,
              sourcePlayerId,
              [toResurrect.id],
              sourceCard.id,
              random
            );
          }
        } else {
          // 通常の蘇生
          const resurrectTargets = sourcePlayer.graveyard.filter(
            (c) => c.type === "creature"
          );
          const chosen = random.choice(resurrectTargets);
          if (chosen) {
            applyResurrect(
              state,
              sourcePlayerId,
              [chosen.id],
              sourceCard.id,
              random
            );
          }
        }
        break;

      case "stun":
        applyStun(state, targets, value, sourceCard.id);
        break;

      case "destroy_deck_top":
        applyDestroyDeckTop(state, sourcePlayerId, value, sourceCard.id);
        break;

      case "swap_attack_health":
        applySwapAttackHealth(state, targets, sourceCard.id);
        break;

      case "hand_discard":
        applyHandDiscard(
          state,
          opponentId,
          value,
          sourceCard.id,
          random,
          effect.targetFilter
        );
        break;

      case "destroy_all_creatures":
        applyDestroyAllCreatures(state, sourceCard.id);
        break;

      default:
        break;
    }
  } catch (error) {
    console.error(`Error executing card effect:`, error);
  }
}

/**
 * 指定タイミングでの効果発動処理
 */
export function processEffectTrigger(
  state: GameState,
  trigger: EffectTrigger,
  sourceCard?: FieldCard | Card,
  sourcePlayerId?: PlayerId,
  // `on_damage_taken` のようなイベントで、トリガーのきっかけとなったカードを渡す
  triggeringCard?: FieldCard | Card
): void {
  const processCardsEffects = (
    cards: FieldCard[],
    playerId: PlayerId,
    triggerSourceCard?: FieldCard
  ) => {
    cards.forEach((card) => {
      if (card.isSilenced) return;
      const effectsToExecute = card.effects.filter(
        (effect) =>
          effect.trigger === trigger &&
          checkEffectCondition(state, playerId, effect.condition)
      );
      effectsToExecute.forEach((effect) => {
        executeCardEffect(state, effect, card, playerId);
      });
    });
  };

  if (
    (trigger === "on_play" || trigger === "on_death") &&
    sourceCard &&
    sourcePlayerId
  ) {
    const effectsToExecute = sourceCard.effects.filter(
      (effect) =>
        effect.trigger === trigger &&
        checkEffectCondition(state, sourcePlayerId, effect.condition)
    );
    // 効果が実際に存在する場合のみイベントログを記録
    if (effectsToExecute.length > 0 && sourcePlayerId && sourceCard) {
      addTriggerEventAction(state, sourcePlayerId, {
        triggerType: trigger,
        sourceCardId: triggeringCard?.id,
        targetCardId: sourceCard.id,
      });
    }
    effectsToExecute.forEach((effect) =>
      executeCardEffect(state, effect, sourceCard, sourcePlayerId)
    );
  } else if (trigger === "on_spell_play" && sourcePlayerId) {
    const opponentId: PlayerId =
      sourcePlayerId === "player1" ? "player2" : "player1";
    state.players[sourcePlayerId].field.forEach((card) => {
      if (card.id === "mag_chant_avatar" && !card.isSilenced) {
        applyDamage(state, [], opponentId, 1, card.id);
      }
    });
    processCardsEffects(state.players[sourcePlayerId].field, sourcePlayerId);
  } else if (trigger === "on_damage_taken" && sourceCard && sourcePlayerId) {
    if ("currentHealth" in sourceCard) {
      processCardsEffects(
        [sourceCard as FieldCard],
        sourcePlayerId,
        sourceCard as FieldCard
      );
    }
  } else if (trigger === "on_ally_death" && sourcePlayerId) {
    // 味方死亡時は全味方クリーチャーの効果をチェック
    processCardsEffects(state.players[sourcePlayerId].field, sourcePlayerId);
  } else {
    // turn_start, turn_end, on_ally_death etc.
    processCardsEffects(state.players.player1.field, "player1");
    processCardsEffects(state.players.player2.field, "player2");
  }
}

/**
 * パッシブ効果の適用
 * 注意: パッシブ効果は場に出ている間継続するため、
 * ゲーム状態計算時に毎回適用される
 */
export function applyPassiveEffects(state: GameState): void {
  // パッシブ効果をリセット（既存のパッシブ効果を除去）
  const resetPassiveModifiers = (cards: FieldCard[]) => {
    cards.forEach((card) => {
      // リセット前に現在の体力を調整
      if (card.passiveHealthModifier > 0) {
        card.currentHealth -= card.passiveHealthModifier;
      }
      // 負の値も考慮して0未満にならないように
      card.currentHealth = Math.max(0, card.currentHealth);

      card.passiveAttackModifier = 0;
      card.passiveHealthModifier = 0;
    });
  };

  // 全プレイヤーのパッシブ効果をリセット
  resetPassiveModifiers(state.players.player1.field);
  resetPassiveModifiers(state.players.player2.field);

  // パッシブ効果を再適用
  const applyPassiveForPlayer = (playerId: PlayerId) => {
    const player = state.players[playerId];
    player.field.forEach((card) => {
      if (card.isSilenced) return; // 沈黙状態のカードは効果を発動しない
      const passiveEffects = card.effects.filter(
        (effect) => effect.trigger === "passive"
      );
      passiveEffects.forEach((effect) => {
        executeCardEffect(state, effect, card, playerId);
      });
    });
  };

  applyPassiveForPlayer("player1");
  applyPassiveForPlayer("player2");
}
