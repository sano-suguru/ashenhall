/**
 * Ashenhall ゲームエンジン コア
 *
 * 設計方針:
 * - 決定論的な戦闘計算（同じ入力なら同じ結果）
 * - 戦闘ログの完全再現が可能
 * - 5秒以内での戦闘完了
 * - 型安全でテスト可能な構造
 */

import type {
  GameState,
  PlayerState,
  PlayerId,
  GamePhase,
  Card,
  FieldCard,
  GameAction,
  GameResult,
  Faction,
  TacticsType,
  CardPlayActionData,
  CardAttackActionData,
  EffectTriggerActionData,
  PhaseChangeActionData,
  CreatureDestroyedActionData,
  TriggerEventActionData,
  EnergyUpdateActionData,
  KeywordTriggerActionData,
} from "@/types/game";
import { GAME_CONSTANTS } from "@/types/game";
import { getCardById } from "@/data/cards/base-cards";
import {
  processEffectTrigger,
  applyPassiveEffects,
  executeCardEffect,
} from "./card-effects";
import { evaluateCardForPlay, chooseAttackTarget } from "./ai-tactics";
import { SeededRandom } from "./seeded-random";

/**
 * 初期ゲーム状態を作成
 */
export function createInitialGameState(
  gameId: string,
  player1Deck: Card[],
  player2Deck: Card[],
  player1Faction: Faction,
  player2Faction: Faction,
  player1Tactics: TacticsType,
  player2Tactics: TacticsType,
  randomSeed: string
): GameState {
  const random = new SeededRandom(randomSeed);

  const createPlayerState = (
    id: PlayerId,
    deck: Card[],
    faction: Faction,
    tactics: TacticsType
  ): PlayerState => {
    const shuffledDeck = random.shuffle(deck);
    const initialHand = shuffledDeck.slice(0, GAME_CONSTANTS.INITIAL_HAND_SIZE); // 初期手札4枚
    const remainingDeck = shuffledDeck.slice(GAME_CONSTANTS.INITIAL_HAND_SIZE);

    return {
      id,
      life: GAME_CONSTANTS.INITIAL_LIFE,
      energy: 1, // 初期エネルギー1
      maxEnergy: 1,
      faction,
      tacticsType: tactics,
      deck: remainingDeck,
      hand: initialHand,
      field: [],
      graveyard: [],
    };
  };

  const startTime = Date.now();

  // 先攻をランダムに決定
  const firstPlayer: PlayerId = random.next() < 0.5 ? "player1" : "player2";

  return {
    gameId,
    turnNumber: 1,
    currentPlayer: firstPlayer,
    phase: "draw",
    players: {
      player1: createPlayerState(
        "player1",
        player1Deck,
        player1Faction,
        player1Tactics
      ),
      player2: createPlayerState(
        "player2",
        player2Deck,
        player2Faction,
        player2Tactics
      ),
    },
    actionLog: [
      {
        sequence: 0,
        playerId: firstPlayer,
        type: "phase_change",
        data: {
          fromPhase: "draw" as GamePhase,
          toPhase: "draw" as GamePhase,
        },
        timestamp: startTime,
      },
    ],
    randomSeed,
    startTime,
  };
}

/**
 * ゲーム状態の完全コピーを作成
 */
function cloneGameState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state));
}

/**
 * アクションをログに追加 - 型別にオーバーロード
 */
function addCardPlayAction(
  state: GameState,
  playerId: PlayerId,
  data: CardPlayActionData
): void {
  const action: GameAction = {
    sequence: state.actionLog.length,
    playerId,
    type: "card_play",
    data,
    timestamp: Date.now(),
  };
  state.actionLog.push(action);
}

function addCardAttackAction(
  state: GameState,
  playerId: PlayerId,
  data: CardAttackActionData
): void {
  const action: GameAction = {
    sequence: state.actionLog.length,
    playerId,
    type: "card_attack",
    data,
    timestamp: Date.now(),
  };
  state.actionLog.push(action);
}

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

function addEffectTriggerAction(
  state: GameState,
  playerId: PlayerId,
  data: EffectTriggerActionData
): void {
  const action: GameAction = {
    sequence: state.actionLog.length,
    playerId,
    type: "effect_trigger",
    data,
    timestamp: Date.now(),
  };
  state.actionLog.push(action);
}

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

function addEnergyUpdateAction(
  state: GameState,
  playerId: PlayerId,
  data: EnergyUpdateActionData
): void {
  const action: GameAction = {
    sequence: state.actionLog.length,
    playerId,
    type: "energy_update",
    data,
    timestamp: Date.now(),
  };
  state.actionLog.push(action);
}

function addPhaseChangeAction(
  state: GameState,
  playerId: PlayerId,
  data: PhaseChangeActionData
): void {
  const action: GameAction = {
    sequence: state.actionLog.length,
    playerId,
    type: "phase_change",
    data,
    timestamp: Date.now(),
  };
  state.actionLog.push(action);
}

function addKeywordTriggerAction(
  state: GameState,
  playerId: PlayerId,
  data: KeywordTriggerActionData
): void {
  const action: GameAction = {
    sequence: state.actionLog.length,
    playerId,
    type: "keyword_trigger",
    data,
    timestamp: Date.now(),
  };
  state.actionLog.push(action);
}

/**
 * カードを場に出す
 */
function playCardToField(
  state: GameState,
  playerId: PlayerId,
  cardId: string,
  position: number
): boolean {
  const player = state.players[playerId];
  const cardIndex = player.hand.findIndex((c) => c.id === cardId);

  if (cardIndex === -1) return false;
  const card = player.hand[cardIndex];

  if (player.energy < card.cost) return false;

  if (card.type === "creature") {
    if (player.field.length >= GAME_CONSTANTS.FIELD_LIMIT) return false;
    if (position < 0 || position > player.field.length)
      position = player.field.length;
  }

  const energyBefore = player.energy;
  player.energy -= card.cost;
  const energyAfter = player.energy;

  player.hand.splice(cardIndex, 1);

  if (card.type === "creature") {
    const fieldCard: FieldCard = {
      ...card,
      owner: playerId,
      currentHealth: card.health,
      attackModifier: 0,
      healthModifier: 0,
      passiveAttackModifier: 0,
      passiveHealthModifier: 0,
      summonTurn: state.turnNumber,
      position,
      hasAttacked: false,
      isStealthed: card.keywords.includes("stealth"),
      isSilenced: false,
      statusEffects: [],
    };
    player.field.splice(position, 0, fieldCard);
    player.field.forEach((c, i) => (c.position = i));
    addCardPlayAction(state, playerId, {
      cardId: card.id,
      position,
      initialStats: { attack: card.attack, health: card.health },
      playerEnergy: { before: energyBefore, after: energyAfter },
    });
    processEffectTrigger(state, "on_play", fieldCard, playerId, fieldCard);
  } else if (card.type === "spell") {
    player.graveyard.push(card); // Move to graveyard before resolving effects
    addCardPlayAction(state, playerId, {
      cardId: card.id,
      position: -1,
      playerEnergy: { before: energyBefore, after: energyAfter },
    });
    processEffectTrigger(state, "on_play", card, playerId, card);
    processEffectTrigger(state, "on_spell_play", undefined, playerId, card);
  }

  return true;
}

/**
 * フェーズを進める
 */
function advancePhase(state: GameState): void {
  const phaseOrder: GamePhase[] = ["draw", "energy", "deploy", "battle", "end"];
  const currentIndex = phaseOrder.indexOf(state.phase);
  const nextPhase = phaseOrder[(currentIndex + 1) % phaseOrder.length];

  // ターンが一周する場合の処理
  if (nextPhase === "draw") {
    const nextPlayer =
      state.currentPlayer === "player1" ? "player2" : "player1";
    const nextTurnNumber = state.turnNumber + 1;

    // ターン開始時は実際に行動するプレイヤーのIDでログを記録
    addPhaseChangeAction(state, nextPlayer, {
      fromPhase: state.phase,
      toPhase: nextPhase,
    });

    state.currentPlayer = nextPlayer;
    state.turnNumber = nextTurnNumber;
  } else {
    // 通常のフェーズ変化
    addPhaseChangeAction(state, state.currentPlayer, {
      fromPhase: state.phase,
      toPhase: nextPhase,
    });
  }

  state.phase = nextPhase;
}

/**
 * ドローフェーズの処理
 */
function processDrawPhase(state: GameState): void {
  const player = state.players[state.currentPlayer];

  // 手札上限チェック
  if (player.hand.length >= GAME_CONSTANTS.HAND_LIMIT) {
    advancePhase(state);
    return;
  }

  // デッキからカードをドロー
  if (player.deck.length > 0) {
    const drawnCard = player.deck.pop()!;
    player.hand.push(drawnCard);
  } else {
    // デッキ切れダメージ
    const lifeBefore = player.life;
    player.life -= 1;
    const lifeAfter = player.life;
    addEffectTriggerAction(state, state.currentPlayer, {
      sourceCardId: "deck_empty",
      effectType: "damage",
      effectValue: 1,
      targets: {
        [state.currentPlayer]: {
          life: { before: lifeBefore, after: lifeAfter },
        },
      },
    });
  }

  advancePhase(state);
}

/**
 * エネルギーフェーズの処理
 * 新仕様: 毎ターン最大エネルギーが1増加（上限8）、毎ターン上限まで回復
 */
function processEnergyPhase(state: GameState): void {
  const player = state.players[state.currentPlayer];
  const maxEnergyBefore = player.maxEnergy;
  const maxEnergyAfter = Math.min(
    player.maxEnergy + 1,
    GAME_CONSTANTS.ENERGY_LIMIT
  );

  if (maxEnergyAfter > maxEnergyBefore) {
    player.maxEnergy = maxEnergyAfter;
    addEnergyUpdateAction(state, state.currentPlayer, {
      maxEnergyBefore,
      maxEnergyAfter,
    });
  }

  // エネルギーを上限まで回復
  player.energy = player.maxEnergy;

  advancePhase(state);
}

/**
 * 配置フェーズの処理（AI自動配置）
 * 完全実装: エネルギー上限まで配置可能、自然な制約で最適化
 */
function processDeployPhase(state: GameState): void {
  applyPassiveEffects(state);
  const player = state.players[state.currentPlayer];
  const random = new SeededRandom(state.randomSeed + state.turnNumber);

  // 無限ループ防止: 理論的最大配置数（場の上限5 + 安全マージン）
  const MAX_DEPLOYMENT_ATTEMPTS = 10;
  let deploymentAttempts = 0;

  // 完全実装: エネルギーと場の制約内で最大配置
  while (deploymentAttempts < MAX_DEPLOYMENT_ATTEMPTS) {
    deploymentAttempts++;

    // 配置可能なカードを再評価（エネルギー・場の状況が変化するため）
    const playableCards = player.hand.filter(
      (card) =>
        card.cost <= player.energy &&
        player.field.length < GAME_CONSTANTS.FIELD_LIMIT
    );

    // 配置可能なカードがない場合は終了
    if (playableCards.length === 0) {
      break;
    }

    // 戦術タイプに応じてカードを評価
    const evaluatedCards = playableCards
      .map((card) => ({
        card,
        score: evaluateCardForPlay(card, state, state.currentPlayer),
      }))
      .sort((a, b) => b.score - a.score);

    // 最も評価の高いカードを配置
    const bestCard = evaluatedCards[0].card;
    const position = player.field.length; // 最後尾に配置

    // 安全性チェック: 配置前の最終確認
    if (
      player.energy >= bestCard.cost &&
      player.field.length < GAME_CONSTANTS.FIELD_LIMIT &&
      player.hand.includes(bestCard)
    ) {
      const success = playCardToField(
        state,
        state.currentPlayer,
        bestCard.id,
        position
      );

      if (!success) {
        // 配置に失敗した場合は終了（予期しない状況）
        break;
      }
      // 成功した場合は次のカードの配置を試行
    } else {
      // 条件を満たさない場合は終了
      break;
    }
  }

  advancePhase(state);
}

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
 * 戦闘フェーズの処理（新キーワード対応版）
 */
function processBattlePhase(state: GameState): void {
  applyPassiveEffects(state);
  const currentPlayer = state.players[state.currentPlayer];
  const opponent =
    state.players[state.currentPlayer === "player1" ? "player2" : "player1"];
  const random = new SeededRandom(
    state.randomSeed + state.turnNumber + state.phase
  );

  const attackers = currentPlayer.field.filter(
    (card) =>
      ((!card.isSilenced && card.keywords.includes("rush")) ||
        card.summonTurn < state.turnNumber) &&
      !card.hasAttacked &&
      !card.statusEffects.some((e) => e.type === "stun") // スタン状態でない
  );

  if (attackers.length === 0) {
    advancePhase(state);
    return;
  }

  attackers.forEach((attacker) => {
    if (attacker.currentHealth <= 0) return;

    // 背水の狂戦士の攻撃条件チェック
    if (attacker.id === "ber_desperate_berserker") {
      if (currentPlayer.life >= opponent.life) {
        return; // 攻撃できずに次のアタッカーへ
      }
    }

    processEffectTrigger(
      state,
      "on_attack",
      attacker,
      currentPlayer.id,
      attacker
    );
    if (attacker.currentHealth <= 0) return;

    const { targetCard: target, targetPlayer } = chooseAttackTarget(
      attacker,
      state,
      random
    );

    const totalAttack =
      attacker.attack +
      attacker.attackModifier +
      attacker.passiveAttackModifier;
    const damage = Math.max(0, totalAttack);
    if (
      damage > 0 &&
      !attacker.isSilenced &&
      attacker.keywords.includes("lifesteal")
    ) {
      currentPlayer.life += damage;
    }

    if (target) {
      if (!attacker.isSilenced && attacker.keywords.includes("poison")) {
        target.statusEffects.push({ type: "poison", duration: 2, damage: 1 });
      }
      const targetHealthBefore = target.currentHealth;
      target.currentHealth -= damage;
      const targetHealthAfter = target.currentHealth;
      processEffectTrigger(
        state,
        "on_damage_taken",
        target,
        opponent.id,
        attacker
      );

      addCardAttackAction(state, currentPlayer.id, {
        attackerCardId: attacker.id,
        targetId: target.id,
        damage,
        targetHealth: { before: targetHealthBefore, after: targetHealthAfter },
      });

      if (target.currentHealth > 0) {
        const totalTargetAttack =
          target.attack + target.attackModifier + target.passiveAttackModifier;
        const retaliateDamage =
          !target.isSilenced && target.keywords.includes("retaliate")
            ? Math.ceil(totalTargetAttack / 2)
            : 0;
        
        if (retaliateDamage > 0) {
          addKeywordTriggerAction(state, opponent.id, {
            keyword: 'retaliate',
            sourceCardId: target.id,
            targetId: attacker.id,
            value: retaliateDamage,
          });
        }

        const defenderDamage = Math.max(0, totalTargetAttack) + retaliateDamage;

        if (defenderDamage > 0) {
          const attackerHealthBefore = attacker.currentHealth;
          attacker.currentHealth -= defenderDamage;
          const attackerHealthAfter = attacker.currentHealth;
          processEffectTrigger(
            state,
            "on_damage_taken",
            attacker,
            currentPlayer.id,
            target
          );
          addCardAttackAction(state, opponent.id, {
            attackerCardId: target.id,
            targetId: attacker.id,
            damage: defenderDamage,
            attackerHealth: {
              before: attackerHealthBefore,
              after: attackerHealthAfter,
            },
          });
        }
      }
    } else if (targetPlayer) {
      const playerLifeBefore = opponent.life;
      opponent.life -= damage;
      const playerLifeAfter = opponent.life;
      addCardAttackAction(state, currentPlayer.id, {
        attackerCardId: attacker.id,
        targetId: opponent.id,
        damage,
        targetPlayerLife: { before: playerLifeBefore, after: playerLifeAfter },
      });
    }
    attacker.hasAttacked = true;
  });

  [currentPlayer, opponent].forEach((player) => {
    const deadCardsInLoop = player.field.filter(
      (card) => card.currentHealth <= 0
    );
    if (deadCardsInLoop.length > 0) {
      deadCardsInLoop.forEach((deadCard) => {
        addCreatureDestroyedAction(state, player.id, {
          destroyedCardId: deadCard.id,
          source: "combat",
        });
        processEffectTrigger(state, "on_death", deadCard, player.id, deadCard);
        //味方死亡時トリガーを（死んだカード以外の）味方に発動
        player.field.forEach((card) => {
          if (card.id !== deadCard.id) {
            processEffectTrigger(
              state,
              "on_ally_death",
              card,
              player.id,
              deadCard
            );
          }
        });
      });

      player.field = player.field.filter((card) => card.currentHealth > 0);
      player.graveyard.push(...deadCardsInLoop);
      player.field.forEach((card, index) => {
        card.position = index;
      });
    }
  });

  advancePhase(state);
}

/**
 * 終了フェーズの処理（新キーワード対応版）
 */
function processEndPhase(state: GameState): void {
  const currentPlayer = state.players[state.currentPlayer];
  const opponent =
    state.players[state.currentPlayer === "player1" ? "player2" : "player1"];

  [currentPlayer, opponent].forEach((player) => {
    player.field.forEach((card) => {
      // 状態異常処理
      card.statusEffects.forEach((effect) => {
        if (effect.type === "poison") {
          const healthBefore = card.currentHealth;
          card.currentHealth -= effect.damage;
          const healthAfter = card.currentHealth;
          addEffectTriggerAction(state, player.id, {
            sourceCardId: "poison_effect",
            effectType: "damage",
            effectValue: effect.damage,
            targets: {
              [card.id]: {
                health: { before: healthBefore, after: healthAfter },
              },
            },
          });
        }
        effect.duration -= 1;
      });

      // 潜伏解除と状態異常のクリーンアップ
      card.isStealthed = false;
      card.hasAttacked = false;
      card.statusEffects = card.statusEffects.filter((e) => e.duration > 0);
    });
  });

  // ターン終了効果
  processEffectTrigger(state, "turn_end");

  // 死亡処理
  [currentPlayer, opponent].forEach((player) => {
    const deadCards = player.field.filter((card) => card.currentHealth <= 0);
    if (deadCards.length > 0) {
      deadCards.forEach((deadCard) => {
        addCreatureDestroyedAction(state, player.id, {
          destroyedCardId: deadCard.id,
          source: "effect",
          sourceCardId: "poison_effect",
        });
        processEffectTrigger(state, "on_death", deadCard, player.id, undefined);
      });
      player.field = player.field.filter((card) => card.currentHealth > 0);
      player.graveyard.push(...deadCards);
      player.field.forEach((card, index) => {
        card.position = index;
      });
    }
  });

  advancePhase(state);
}

/**
 * 勝利判定
 */
function checkGameEnd(state: GameState): GameResult | null {
  const player1 = state.players.player1;
  const player2 = state.players.player2;

  // ライフ0での敗北
  if (player1.life <= 0 && player2.life <= 0) {
    return {
      winner: null,
      reason: "life_zero",
      totalTurns: state.turnNumber,
      durationSeconds: Math.floor((Date.now() - state.startTime) / 1000),
      endTime: Date.now(),
    };
  } else if (player1.life <= 0) {
    return {
      winner: "player2",
      reason: "life_zero",
      totalTurns: state.turnNumber,
      durationSeconds: Math.floor((Date.now() - state.startTime) / 1000),
      endTime: Date.now(),
    };
  } else if (player2.life <= 0) {
    return {
      winner: "player1",
      reason: "life_zero",
      totalTurns: state.turnNumber,
      durationSeconds: Math.floor((Date.now() - state.startTime) / 1000),
      endTime: Date.now(),
    };
  }

  // 制限時間による終了（30ターン）
  if (state.turnNumber > 30) {
    const winner =
      player1.life > player2.life
        ? "player1"
        : player2.life > player1.life
        ? "player2"
        : null;
    return {
      winner,
      reason: "timeout",
      totalTurns: state.turnNumber,
      durationSeconds: Math.floor((Date.now() - state.startTime) / 1000),
      endTime: Date.now(),
    };
  }

  return null; // ゲーム続行
}

/**
 * ゲーム状態を1ステップ進める
 */
export function processGameStep(state: GameState): GameState {
  const newState = cloneGameState(state);

  // ゲーム終了チェック
  const gameResult = checkGameEnd(newState);
  if (gameResult) {
    newState.result = gameResult;
    return newState;
  }

  // フェーズ処理
  switch (newState.phase) {
    case "draw":
      processDrawPhase(newState);
      break;
    case "energy":
      processEnergyPhase(newState);
      break;
    case "deploy":
      processDeployPhase(newState);
      break;
    case "battle":
      processBattlePhase(newState);
      break;
    case "end":
      processEndPhase(newState);
      break;
  }

  return newState;
}

/**
 * ゲームを完了まで実行
 */
export function executeFullGame(
  gameId: string,
  player1Deck: Card[],
  player2Deck: Card[],
  player1Faction: Faction,
  player2Faction: Faction,
  player1Tactics: TacticsType,
  player2Tactics: TacticsType,
  randomSeed: string
): GameState {
  let gameState = createInitialGameState(
    gameId,
    player1Deck,
    player2Deck,
    player1Faction,
    player2Faction,
    player1Tactics,
    player2Tactics,
    randomSeed
  );

  const maxSteps = 1000; // 無限ループ防止
  let steps = 0;

  while (!gameState.result && steps < maxSteps) {
    gameState = processGameStep(gameState);
    steps++;
  }

  // 強制終了の場合
  if (!gameState.result) {
    gameState.result = {
      winner: null,
      reason: "timeout",
      totalTurns: gameState.turnNumber,
      durationSeconds: Math.floor((Date.now() - gameState.startTime) / 1000),
      endTime: Date.now(),
    };
  }

  return gameState;
}
