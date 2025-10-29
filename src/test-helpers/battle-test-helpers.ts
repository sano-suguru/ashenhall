/**
 * 戦闘テスト専用ヘルパー関数
 *
 * 複雑な戦闘シナリオのセットアップと検証を簡素化し、
 * ESLint複雑度制限に準拠したテスト作成を支援する。
 */

import { createInitialGameState, processGameStep } from '@/lib/game-engine/core';
import { necromancerCards, berserkerCards } from '@/data/cards/base-cards';
import { createCardFromTemplate } from '@/data/cards/card-registry';
import { findCreatureTemplateById, ensureTwoCreatureTemplates } from '@/lib/type-guards';
import { generateFieldInstanceId } from '@/lib/instance-id-generator';
import type { Card, Faction, GameState, FieldCard, CreatureCard } from '@/types/game';

/**
 * 戦闘テスト用の基本設定
 */
interface BattleTestConfig {
  testGameId: string;
  testSeed: string;
  player1Faction: Faction;
  player2Faction: Faction;
}

/**
 * デフォルトの戦闘テスト設定
 */
const DEFAULT_BATTLE_CONFIG: BattleTestConfig = {
  testGameId: 'battle-test-001',
  testSeed: 'battle-test-seed',
  player1Faction: 'berserker',
  player2Faction: 'necromancer',
};

/**
 * 標準的なテスト用デッキを作成
 */
function createStandardTestDeck(): Card[] {
  const deck: Card[] = [];
  const availableCards = necromancerCards.slice(0, 4);

  availableCards.forEach((card, cardIndex) => {
    for (let i = 0; i < 5; i++) {
      const instanceId = `test-${card.templateId}_${cardIndex}_${i}`;
      const cardInstance = createCardFromTemplate(card, instanceId);
      deck.push(cardInstance);
    }
  });

  return deck;
}

/**
 * 守護戦闘シナリオのセットアップ
 */
interface GuardBattleSetup {
  gameState: GameState;
  attackerCard: CreatureCard;
  guardCards: CreatureCard[];
  normalCards: CreatureCard[];
}

/**
 * 複数守護のランダム選択テスト用シナリオを作成
 */
function setupMultipleGuardBattleScenario(
  config: Partial<BattleTestConfig> = {},
  attemptNumber: number = 0
): GuardBattleSetup {
  const finalConfig = { ...DEFAULT_BATTLE_CONFIG, ...config };
  const testSeed = `${finalConfig.testSeed}_multi_guard_${attemptNumber}`;

  const deck1 = createStandardTestDeck();
  const deck2 = createStandardTestDeck();

  const gameState = createInitialGameState(
    finalConfig.testGameId,
    deck1,
    deck2,
    finalConfig.player1Faction,
    finalConfig.player2Faction,
    testSeed
  );

  // 攻撃者カードを取得してインスタンス化
  const attackerTemplate = findCreatureTemplateById(berserkerCards, 'ber_warrior', '攻撃者カード');
  const attackerCard = createCardFromTemplate(
    attackerTemplate,
    `test-attacker-${attemptNumber}`
  ) as CreatureCard;

  // 守護カードを取得してインスタンス化
  const guardCard1Template = necromancerCards.find((c) => c.templateId === 'necro_skeleton');
  const guardCard2Template = necromancerCards.find((c) => c.templateId === 'necro_wraith');
  const [guard1Template, guard2Template] = ensureTwoCreatureTemplates(
    guardCard1Template,
    guardCard2Template,
    '守護カード1',
    '守護カード2'
  );

  const guard1 = createCardFromTemplate(
    guard1Template,
    `test-guard1-${attemptNumber}`
  ) as CreatureCard;
  const guard2 = createCardFromTemplate(
    guard2Template,
    `test-guard2-${attemptNumber}`
  ) as CreatureCard;

  return {
    gameState,
    attackerCard,
    guardCards: [guard1, guard2],
    normalCards: [],
  };
}

/**
 * 戦闘場にクリーチャーを配置
 */
export function placeCreatureOnField(
  gameState: GameState,
  playerId: 'player1' | 'player2',
  creature: CreatureCard,
  options: {
    id?: string;
    position?: number;
    addGuardKeyword?: boolean;
    currentHealth?: number;
  } = {}
): void {
  const effectiveTemplateId = options.id || creature.templateId;
  const fieldCreature: FieldCard = {
    ...creature,
    templateId: effectiveTemplateId,
    instanceId: generateFieldInstanceId(effectiveTemplateId, gameState, playerId),
    keywords: options.addGuardKeyword ? [...creature.keywords, 'guard'] : creature.keywords,
    owner: playerId,
    currentHealth: options.currentHealth ?? creature.health,
    attackModifier: 0,
    healthModifier: 0,
    passiveAttackModifier: 0,
    passiveHealthModifier: 0,
    summonTurn: 0,
    position: options.position ?? gameState.players[playerId].field.length,
    hasAttacked: false,
    isStealthed: false,
    isSilenced: false,
    statusEffects: [],
    readiedThisTurn: false,
  };

  gameState.players[playerId].field.push(fieldCreature);
}

/**
 * 戦闘フェーズを完全実行
 */
export function executeBattlePhaseCompletely(gameState: GameState): GameState {
  let currentState = { ...gameState };
  currentState.currentPlayer = 'player1';
  currentState.phase = 'battle';

  // battle → battle_attack への移行
  currentState = processGameStep(currentState);

  // 全攻撃者を処理するまでループ
  while (currentState.phase === 'battle_attack' && !currentState.result) {
    currentState = processGameStep(currentState);
  }

  return currentState;
}

/**
 * 攻撃ログからターゲット情報を抽出
 */
function extractAttackTargets(gameState: GameState): string[] {
  const attackActions = gameState.actionLog.filter((action) => action.type === 'card_attack');

  return attackActions
    .map((action) => {
      if (action.type === 'card_attack') {
        return action.data.targetId;
      }
      return null;
    })
    .filter((targetId): targetId is string => targetId !== null);
}

/**
 * 複数回の守護選択テストを実行
 */
export function runMultipleGuardSelectionTest(
  testRounds: number = 5,
  config: Partial<BattleTestConfig> = {}
): Map<string, number> {
  const targetCounts = new Map<string, number>();

  for (let attempt = 0; attempt < testRounds; attempt++) {
    const setup = setupMultipleGuardBattleScenario(config, attempt);

    // 攻撃者を配置
    placeCreatureOnField(setup.gameState, 'player1', setup.attackerCard);

    // 複数の守護を配置し、実際のinstanceIdを記録
    const actualGuardIds: string[] = [];
    setup.guardCards.forEach((guardCard, index) => {
      placeCreatureOnField(setup.gameState, 'player2', guardCard, {
        id: `guard_${index + 1}_${attempt}`,
        position: index,
        addGuardKeyword: true,
      });
      // placeCreatureOnField後に実際のinstanceIdを取得
      const placedCard = setup.gameState.players.player2.field[index];
      if (placedCard) {
        actualGuardIds.push(placedCard.instanceId);
      }
    });

    // 戦闘実行
    const finalState = executeBattlePhaseCompletely(setup.gameState);

    // 攻撃対象を記録（実際のinstanceIdを使用）
    const attackTargets = extractAttackTargets(finalState);

    attackTargets.forEach((targetId) => {
      if (actualGuardIds.includes(targetId)) {
        targetCounts.set(targetId, (targetCounts.get(targetId) || 0) + 1);
      }
    });
  }

  return targetCounts;
}

/**
 * 直接攻撃テスト用のゲーム進行結果
 */
interface DirectAttackTestResult {
  foundTargetScenario: boolean;
  attackOccurred: boolean;
  gameCompleted: boolean;
}

/**
 * 相手の場が空の場合の直接攻撃をテスト
 */
export function testDirectAttackWhenFieldEmpty(
  config: Partial<BattleTestConfig> = {}
): DirectAttackTestResult {
  const finalConfig = { ...DEFAULT_BATTLE_CONFIG, ...config };
  const deck1 = createStandardTestDeck();
  const deck2 = createStandardTestDeck();

  let gameState = createInitialGameState(
    finalConfig.testGameId,
    deck1,
    deck2,
    finalConfig.player1Faction,
    finalConfig.player2Faction,
    `${finalConfig.testSeed}_direct_attack`
  );

  const maxSteps = 100;

  for (let steps = 0; steps < maxSteps && !gameState.result; steps++) {
    gameState = processGameStep(gameState);

    // 理想的なシナリオ：player1がカードを持ち、player2が空の場合
    const hasTargetScenario = checkDirectAttackScenario(gameState);

    if (hasTargetScenario) {
      const result = executeDirectAttackScenario(gameState);
      return {
        foundTargetScenario: true,
        attackOccurred: result.attackOccurred,
        gameCompleted: true,
      };
    }
  }

  return {
    foundTargetScenario: false,
    attackOccurred: false,
    gameCompleted: !!gameState.result,
  };
}

/**
 * 直接攻撃可能なシナリオかチェック
 */
function checkDirectAttackScenario(gameState: GameState): boolean {
  const player1HasCards = gameState.players.player1.field.length > 0;
  const player2HasNoCards = gameState.players.player2.field.length === 0;
  const isPlayer1Turn = gameState.currentPlayer === 'player1';
  const isBattlePhase = gameState.phase === 'battle';

  return player1HasCards && player2HasNoCards && isPlayer1Turn && isBattlePhase;
}

/**
 * 直接攻撃シナリオを実行し結果を返す
 */
function executeDirectAttackScenario(gameState: GameState): { attackOccurred: boolean } {
  const initialPlayer2Life = gameState.players.player2.life;
  const processedState = processGameStep(gameState);
  const finalPlayer2Life = processedState.players.player2.life;

  // 攻撃が発生したかチェック
  const attackOccurred = finalPlayer2Life < initialPlayer2Life;

  if (attackOccurred) {
    // 直接攻撃ログの存在確認
    const attackActions = processedState.actionLog.filter(
      (action) =>
        action.type === 'card_attack' &&
        (action.data.targetId === 'player1' || action.data.targetId === 'player2')
    );

    if (attackActions.length === 0) {
      throw new Error('ライフが減少したが攻撃ログが見つからない');
    }
  }

  return { attackOccurred };
}

/**
 * 守護なし攻撃テスト用のシナリオセットアップ
 */
export function setupNoGuardBattleScenario(
  config: Partial<BattleTestConfig> = {}
): GuardBattleSetup {
  const finalConfig = { ...DEFAULT_BATTLE_CONFIG, ...config };
  const deck1 = createStandardTestDeck();
  const deck2 = createStandardTestDeck();

  const gameState = createInitialGameState(
    finalConfig.testGameId,
    deck1,
    deck2,
    finalConfig.player1Faction,
    finalConfig.player2Faction,
    `${finalConfig.testSeed}_no_guard`
  );

  // 攻撃者カードを取得してインスタンス化
  const attackerTemplate = findCreatureTemplateById(berserkerCards, 'ber_warrior', '攻撃者カード');
  const attackerCard = createCardFromTemplate(
    attackerTemplate,
    'test-attacker-no-guard'
  ) as CreatureCard;

  // 通常カード（守護なし）を取得してインスタンス化
  const normalTemplate = findCreatureTemplateById(necromancerCards, 'necro_wraith', '通常カード');
  const normalCard = createCardFromTemplate(normalTemplate, 'test-normal-no-guard') as CreatureCard;

  return {
    gameState,
    attackerCard,
    guardCards: [],
    normalCards: [normalCard],
  };
}

/**
 * 攻撃結果の検証
 */
interface AttackVerificationResult {
  playerAttacked: boolean;
  creatureAttacked: boolean;
  isValidResult: boolean;
}

/**
 * 守護なしでの攻撃結果を検証
 */
export function verifyNoGuardAttackResult(
  gameState: GameState,
  initialPlayer2Life: number,
  initialNormalHealth: number
): AttackVerificationResult {
  const finalPlayer2Life = gameState.players.player2.life;
  const finalNormalHealth = gameState.players.player2.field[0]?.currentHealth || 0;

  const playerAttacked = finalPlayer2Life < initialPlayer2Life;
  const creatureAttacked = finalNormalHealth < initialNormalHealth;

  // どちらか一方が攻撃されている（両方はありえない）
  const isValidResult =
    (playerAttacked || creatureAttacked) && !(playerAttacked && creatureAttacked);

  return {
    playerAttacked,
    creatureAttacked,
    isValidResult,
  };
}
