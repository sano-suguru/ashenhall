/**
 * 戦闘テスト専用ヘルパー関数
 * 
 * 複雑な戦闘シナリオのセットアップと検証を簡素化し、
 * ESLint複雑度制限に準拠したテスト作成を支援する。
 */

import { createInitialGameState, processGameStep } from '@/lib/game-engine/core';
import { necromancerCards, berserkerCards } from '@/data/cards/base-cards';
import { ensureTwoCreatures, findCreatureById } from '@/lib/type-guards';
import type { Card, Faction, TacticsType, GameState, FieldCard, CreatureCard } from '@/types/game';

/**
 * 戦闘テスト用の基本設定
 */
export interface BattleTestConfig {
  testGameId: string;
  testSeed: string;
  player1Faction: Faction;
  player2Faction: Faction;
  player1Tactics: TacticsType;
  player2Tactics: TacticsType;
}

/**
 * デフォルトの戦闘テスト設定
 */
export const DEFAULT_BATTLE_CONFIG: BattleTestConfig = {
  testGameId: 'battle-test-001',
  testSeed: 'battle-test-seed',
  player1Faction: 'berserker',
  player2Faction: 'necromancer',
  player1Tactics: 'aggressive',
  player2Tactics: 'defensive'
};

/**
 * 標準的なテスト用デッキを作成
 */
export function createStandardTestDeck(): Card[] {
  const deck: Card[] = [];
  const availableCards = necromancerCards.slice(0, 4);
  
  availableCards.forEach(card => {
    for (let i = 0; i < 5; i++) {
      deck.push({ ...card, templateId: `${card.templateId}_${i}` });
    }
  });
  
  return deck;
}

/**
 * 守護戦闘シナリオのセットアップ
 */
export interface GuardBattleSetup {
  gameState: GameState;
  attackerCard: CreatureCard;
  guardCards: CreatureCard[];
  normalCards: CreatureCard[];
}

/**
 * 複数守護のランダム選択テスト用シナリオを作成
 */
export function setupMultipleGuardBattleScenario(
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
    finalConfig.player1Tactics,
    finalConfig.player2Tactics,
    testSeed
  );

  // 攻撃者カードを取得
  const attackerCard = findCreatureById(berserkerCards, 'ber_warrior', '攻撃者カード');

  // 守護カードを取得
  const guardCard1 = necromancerCards.find(c => c.templateId === 'necro_skeleton');
  const guardCard2 = necromancerCards.find(c => c.templateId === 'necro_wraith');
  const [guard1, guard2] = ensureTwoCreatures(guardCard1, guardCard2, '守護カード1', '守護カード2');

  return {
    gameState,
    attackerCard,
    guardCards: [guard1, guard2],
    normalCards: []
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
  const fieldCreature: FieldCard = {
    ...creature,
    templateId: options.id || creature.templateId,
    keywords: options.addGuardKeyword 
      ? [...creature.keywords, 'guard'] 
      : creature.keywords,
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
export function extractAttackTargets(gameState: GameState): string[] {
  const attackActions = gameState.actionLog.filter(action => action.type === 'card_attack');
  
  return attackActions
    .map(action => {
      if (action.type === 'card_attack') {
        return action.data.targetId;
      }
      return null;
    })
    .filter((targetId): targetId is string => targetId !== null);
}

/**
 * 守護攻撃の結果を検証
 */
export function verifyGuardAttackResult(
  gameState: GameState, 
  expectedGuardIds: string[]
): boolean {
  const attackTargets = extractAttackTargets(gameState);
  
  // 守護のいずれかが攻撃されているかチェック
  return attackTargets.some(targetId => expectedGuardIds.includes(targetId));
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
    
    // 複数の守護を配置
    setup.guardCards.forEach((guardCard, index) => {
      placeCreatureOnField(setup.gameState, 'player2', guardCard, {
        id: `guard_${index + 1}_${attempt}`,
        position: index,
        addGuardKeyword: true
      });
    });

    // 戦闘実行
    const finalState = executeBattlePhaseCompletely(setup.gameState);
    
    // 攻撃対象を記録
    const attackTargets = extractAttackTargets(finalState);
    const guardIds = setup.guardCards.map((_, index) => `guard_${index + 1}_${attempt}`);
    
    attackTargets.forEach(targetId => {
      if (guardIds.includes(targetId)) {
        targetCounts.set(targetId, (targetCounts.get(targetId) || 0) + 1);
      }
    });
  }

  return targetCounts;
}

/**
 * 直接攻撃テスト用のゲーム進行結果
 */
export interface DirectAttackTestResult {
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
    'aggressive', // 攻撃重視でカードを出やすくする
    'defensive',
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
        gameCompleted: true
      };
    }
  }

  return {
    foundTargetScenario: false,
    attackOccurred: false,
    gameCompleted: !!gameState.result
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
    const attackActions = processedState.actionLog.filter(action => 
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
    finalConfig.player1Tactics,
    finalConfig.player2Tactics,
    `${finalConfig.testSeed}_no_guard`
  );

  // 攻撃者カードを取得
  const attackerCard = findCreatureById(berserkerCards, 'ber_warrior', '攻撃者カード');

  // 通常カード（守護なし）を取得
  const normalCard = findCreatureById(necromancerCards, 'necro_wraith', '通常カード');

  return {
    gameState,
    attackerCard,
    guardCards: [],
    normalCards: [normalCard]
  };
}

/**
 * 攻撃結果の検証
 */
export interface AttackVerificationResult {
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
  const isValidResult = (playerAttacked || creatureAttacked) && !(playerAttacked && creatureAttacked);
  
  return {
    playerAttacked,
    creatureAttacked,
    isValidResult
  };
}
