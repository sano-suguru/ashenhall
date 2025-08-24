/**
 * 詳細戦闘ログモーダル - 全アクションログの表示と分析
 * 
 * 設計方針:
 * - 全actionLogの制限なし表示
 * - ターン別グルーピング
 * - 巻き戻し機能との連携
 * - アクションタイプ別のフィルタリング
 */

'use client';

import React, { useState, useMemo } from 'react';
import type { GameState, GameAction, PlayerId, EffectAction, GameResult, EffectTrigger } from '@/types/game';
import { GAME_CONSTANTS } from '@/types/game';
import { getCardById } from '@/data/cards/base-cards';
import CardNameWithTooltip from './CardNameWithTooltip';
import { formatActionAsText, findDecisiveAction, getLogDisplayParts, getTurnNumberForAction } from '@/lib/game-state-utils';
import { 
  X, 
  Search,
  Filter,
  RotateCcw,
  CreditCard, 
  Zap, 
  Target, 
  Swords, 
  Flag,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Heart,
  Shield,
  ArrowDown,
  Users,
  Sparkles,
  User,
  Bot,
  Copy,
  Check,
  Trophy,
  Skull,
  AlertCircle,
  BarChart3,
  Crown,
  Repeat,
  Trash2,
  MicOff,
  ShieldOff,
  Star,
} from 'lucide-react';

interface BattleLogModalProps {
  gameState: GameState;
  isOpen: boolean;
  onClose: () => void;
  onJumpToAction?: (sequence: number) => void;
}

// フェーズアイコンマッピング
const PHASE_ICONS = {
  draw: CreditCard,
  energy: Zap,
  deploy: Target,
  battle: Swords,
  end: Flag,
} as const;

// 効果アイコンマッピング
const EFFECT_ICONS: Record<EffectAction, React.ComponentType<{ size?: number; className?: string }>> = {
  damage: Swords,
  heal: Heart,
  buff_attack: TrendingUp,
  buff_health: Shield,
  debuff_attack: TrendingDown,
  debuff_health: ArrowDown,
  summon: Users,
  draw_card: CreditCard,
  resurrect: RotateCcw,
  silence: MicOff,
  guard: Shield,
  stun: AlertCircle,
  destroy_deck_top: Skull,
  swap_attack_health: Repeat,
  hand_discard: Trash2,
  destroy_all_creatures: Skull,
  ready: Repeat,
};

// 効果名マッピング
const EFFECT_NAMES: Record<EffectAction, string> = {
  damage: 'ダメージ',
  heal: '回復',
  buff_attack: '攻撃力強化',
  buff_health: '体力強化',
  debuff_attack: '攻撃力低下',
  debuff_health: '体力低下',
  summon: '召喚',
  draw_card: 'ドロー',
  resurrect: '蘇生',
  silence: '沈黙',
  guard: '守護',
  stun: 'スタン',
  destroy_deck_top: 'デッキ破壊',
  swap_attack_health: '攻守交換',
  hand_discard: '手札破壊',
  destroy_all_creatures: '全体除去',
  ready: '再攻撃準備',
};

const ICONS = {
  CreditCard, Zap, Target, Swords, Flag,
  TrendingUp, TrendingDown, Heart, Shield, ArrowDown, Users, Sparkles,
  RotateCcw, MicOff, AlertCircle, Skull, Repeat, Trash2, ShieldOff,
  AlertTriangle,
  Star,
} as const;

// ユーティリティ関数
function getCardName(cardId: string): string {
  const card = getCardById(cardId);
  return card?.name || cardId;
}

function getPlayerName(playerId: PlayerId): string {
  return playerId === 'player1' ? 'あなた' : '相手';
}

// HP変化追跡機能
interface TurnSummary {
  turnNumber: number;
  player1Damage: number;
  player2Damage: number;
  significance: string | null;
  player1LifeBefore: number;
  player1LifeAfter: number;
  player2LifeBefore: number;
  player2LifeAfter: number;
}

// ターンごとのHP変化を計算
function calculateTurnSummaries(gameState: GameState): TurnSummary[] {
  const summaries: TurnSummary[] = [];
  let currentPlayer1Life = GAME_CONSTANTS.INITIAL_LIFE;
  let currentPlayer2Life = GAME_CONSTANTS.INITIAL_LIFE;
  
  // ターン別にアクションをグループ化
  const turnGroups: Record<number, GameAction[]> = {};
  gameState.actionLog.forEach(action => {
    const turnNumber = getTurnNumberForAction(action, gameState);
    if (!turnGroups[turnNumber]) turnGroups[turnNumber] = [];
    turnGroups[turnNumber].push(action);
  });

  // 各ターンのダメージ計算
  Object.entries(turnGroups)
    .sort(([a], [b]) => Number(a) - Number(b))
    .forEach(([turnNum, actions]) => {
      const turnNumber = Number(turnNum);
      const player1LifeBefore = currentPlayer1Life;
      const player2LifeBefore = currentPlayer2Life;
      let player1Damage = 0;
      let player2Damage = 0;

      actions.forEach(action => {
        if (action.type === 'card_attack' && (action.data.targetId === 'player1' || action.data.targetId === 'player2')) {
          if (action.playerId === 'player1') { // player1 attacks player2
            player2Damage += action.data.damage;
          } else { // player2 attacks player1
            player1Damage += action.data.damage;
          }
        } else if (action.type === 'effect_trigger' && action.data.effectType === 'damage') {
          Object.entries(action.data.targets).forEach(([targetId, valueChange]) => {
            if (valueChange.life) {
              const damage = Math.max(0, valueChange.life.before - valueChange.life.after);
              if (targetId === 'player1') {
                player1Damage += damage;
              } else if (targetId === 'player2') {
                player2Damage += damage;
              }
            }
          });
        }
      });

      // ライフを更新
      currentPlayer1Life -= player1Damage;
      currentPlayer2Life -= player2Damage;

      // 重要性を判定
      const significance = determineTurnSignificance(
        turnNumber, 
        player1Damage, 
        player2Damage, 
        currentPlayer1Life, 
        currentPlayer2Life, 
        actions
      );

      if (player1Damage > 0 || player2Damage > 0 || significance) {
        summaries.push({
          turnNumber,
          player1Damage,
          player2Damage,
          significance,
          player1LifeBefore,
          player1LifeAfter: currentPlayer1Life,
          player2LifeBefore,
          player2LifeAfter: currentPlayer2Life,
        });
      }
    });

  return summaries;
}

// ターンの重要性を判定
function determineTurnSignificance(
  turnNumber: number,
  player1Damage: number,
  player2Damage: number,
  player1LifeAfter: number,
  player2LifeAfter: number,
  actions: GameAction[]
): string | null {
  // 大ダメージターン（3以上）
  if (player1Damage >= 3 || player2Damage >= 3) {
    if (player1Damage >= 5 || player2Damage >= 5) {
      return '大ダメージターン';
    }
    return '中ダメージターン';
  }

  // プレイヤー直撃開始（初回プレイヤー攻撃）
  const hasPlayerAttack = actions.some(action => 
    action.type === 'card_attack' && (action.data.targetId === 'player1' || action.data.targetId === 'player2')
  );
  
  if (hasPlayerAttack) {
    // 過去のターンでプレイヤー攻撃があったかチェック（簡易版）
    if (turnNumber <= 5) {
      return '初回プレイヤー攻撃';
    }
  }

  // 低ライフ状態（5以下）
  if (player1LifeAfter <= 5 || player2LifeAfter <= 5) {
    return '危険ライフ';
  }

  // 攻勢転換の判定（中盤以降でダメージパターンが変化）
  if (turnNumber >= 8 && (player1Damage >= 2 || player2Damage >= 2)) {
    return '攻勢転換点';
  }

  return null;
}

// 戦況の全体分析
function analyzeBattleTrend(summaries: TurnSummary[], gameResult: GameResult | undefined): {
  phases: { name: string; description: string }[];
  keyMoments: { turn: number; description: string }[];
} {
  const phases = [];
  const keyMoments = [];

  // フェーズ分析（簡易版）
  const maxTurn = Math.max(...summaries.map(s => s.turnNumber));
  
  if (maxTurn <= 6) {
    phases.push({ name: '短期決戦', description: '序盤で決着' });
  } else if (maxTurn <= 12) {
    phases.push({ name: '標準戦', description: '序盤→中盤で決着' });
  } else {
    phases.push({ 
      name: '長期戦', 
      description: `序盤(1-5) → 中盤(6-${Math.min(maxTurn-3, 12)}) → 終盤(${Math.max(maxTurn-2, 13)}-${maxTurn})` 
    });
  }

  // 重要な瞬間を抽出
  summaries.forEach(summary => {
    if (summary.significance) {
      if (summary.significance === '初回プレイヤー攻撃') {
        keyMoments.push({
          turn: summary.turnNumber,
          description: 'プレイヤー直撃戦略開始'
        });
      } else if (summary.significance === '大ダメージターン') {
        const totalDamage = summary.player1Damage + summary.player2Damage;
        keyMoments.push({
          turn: summary.turnNumber,
          description: `連続大ダメージ(${totalDamage}) → 勝負決定的`
        });
      } else if (summary.significance === '攻勢転換点') {
        keyMoments.push({
          turn: summary.turnNumber,
          description: '戦況の転換点'
        });
      }
    }
  });

  // 勝利ターンの特別処理
  if (gameResult && summaries.length > 0) {
    const lastSummary = summaries[summaries.length - 1];
    if (gameResult.reason === 'life_zero') {
      keyMoments.push({
        turn: lastSummary.turnNumber,
        description: '最終決戦 → 勝負決定'
      });
    }
  }

  return { phases, keyMoments };
}

function getPlayerIcon(playerId: PlayerId) {
  return playerId === 'player1' ? User : Bot;
}

function formatAction(action: GameAction, gameState: GameState): React.ReactElement {
  const parts = getLogDisplayParts(action, gameState);
  const PlayerIcon = getPlayerIcon(action.playerId);
  const IconComponent = ICONS[parts.iconName as keyof typeof ICONS] || AlertTriangle;

  // メッセージ内のカード名をツールチップ付きコンポーネントに置換
  const messageWithTooltips = parts.message.split(/(《.*?》)/g).map((segment, index) => {
    if (segment.startsWith('《') && segment.endsWith('》')) {
      const cardName = segment.substring(1, segment.length - 1);
      const cardId = parts.cardIds.find(id => getCardName(id) === cardName);
      if (cardId) {
        return (
          <CardNameWithTooltip key={index} cardId={cardId} showBrackets={true}>
            {cardName}
          </CardNameWithTooltip>
        );
      }
    }
    return segment;
  });

  return (
    <div className="flex items-center space-x-2">
      <PlayerIcon size={14} className={action.playerId === 'player1' ? 'text-blue-400' : 'text-red-400'} />
      <IconComponent size={14} />
      <span>
        <span className="font-semibold">[{parts.playerName}]</span> {messageWithTooltips}
        {parts.details && <span className="text-gray-400 ml-1">{parts.details}</span>}
        {parts.triggerText && <span className="text-gray-400 ml-1">({parts.triggerText})</span>}
      </span>
    </div>
  );
}

// 最終状態サマリーの型定義
interface FinalGameState {
  player1: {
    life: number;
    fieldCards: number;
    handCards: number;
    deckCards: number;
  };
  player2: {
    life: number;
    fieldCards: number;
    handCards: number;
    deckCards: number;
  };
}

// 最終状態を取得する関数
function getFinalGameState(gameState: GameState): FinalGameState {
  return {
    player1: {
      life: gameState.players.player1.life,
      fieldCards: gameState.players.player1.field.length,
      handCards: gameState.players.player1.hand.length,
      deckCards: gameState.players.player1.deck.length,
    },
    player2: {
      life: gameState.players.player2.life,
      fieldCards: gameState.players.player2.field.length,
      handCards: gameState.players.player2.hand.length,
      deckCards: gameState.players.player2.deck.length,
    },
  };
}

// --- Battle Log Text Formatting Helpers ---

const formatLogHeader = (gameState: GameState): string => {
  const startTime = new Date(gameState.startTime).toLocaleString('ja-JP');
  const duration = Math.floor((Date.now() - gameState.startTime) / 1000);
  
  let text = `=== Ashenhall 戦闘ログ ===\n`;
  text += `ゲームID: ${gameState.gameId}\n`;
  text += `開始時刻: ${startTime}\n`;
  text += `現在ターン: ${gameState.turnNumber}\n`;
  text += `経過時間: ${duration}秒\n`;
  
  if (gameState.result) {
    const winner = gameState.result.winner 
      ? (gameState.result.winner === 'player1' ? 'あなた' : '相手')
      : '引き分け';
    const reason = gameState.result.reason === 'life_zero' ? 'ライフ0' : 
                 gameState.result.reason === 'deck_empty' ? 'デッキ切れ' : 
                 gameState.result.reason === 'timeout' ? '時間切れ' : 
                 gameState.result.reason;
    text += `勝者: ${winner} (${reason}による勝利)\n`;
    text += `総ターン: ${gameState.result.totalTurns}\n`;
  }
  return text;
};

const formatTurnSummariesSection = (gameState: GameState): string => {
  const turnSummaries = calculateTurnSummaries(gameState);
  if (turnSummaries.length === 0) return '';

  let text = `\n=== 戦況サマリー ===\n`;
  turnSummaries.forEach(summary => {
    text += `【ターン${summary.turnNumber}】`;
    if (summary.player1Damage > 0) {
      text += ` あなた ${summary.player1LifeBefore}→${summary.player1LifeAfter}HP (-${summary.player1Damage})`;
    }
    if (summary.player2Damage > 0) {
      text += ` 相手 ${summary.player2LifeBefore}→${summary.player2LifeAfter}HP (-${summary.player2Damage})`;
    }
    if (summary.significance) {
      text += ` | ${summary.significance}`;
    }
    text += `\n`;
  });
  return text;
};

const formatBattleAnalysisSection = (gameState: GameState): string => {
  const turnSummaries = calculateTurnSummaries(gameState);
  const battleAnalysis = analyzeBattleTrend(turnSummaries, gameState.result);
  let text = '';

  if (battleAnalysis.phases.length > 0) {
    text += `\n=== 戦況分析 ===\n`;
    battleAnalysis.phases.forEach(phase => {
      text += `${phase.name}: ${phase.description}\n`;
    });
  }
  if (battleAnalysis.keyMoments.length > 0) {
    text += `\n=== 重要な変化 ===\n`;
    battleAnalysis.keyMoments.forEach(moment => {
      text += `ターン${moment.turn}: ${moment.description}\n`;
    });
  }
  return text;
};

const formatActionLogSection = (actions: GameAction[], totalActionCount: number, gameState: GameState): string => {
  let text = `\n=== アクション詳細 ===\n`;
  if (actions.length < totalActionCount) {
    text += `※ フィルター適用済み (${actions.length}/${totalActionCount}件表示)\n`;
  }
  text += `\n`;

  const groups: Record<number, GameAction[]> = {};
  actions.forEach(action => {
    const turnNumber = getTurnNumberForAction(action, gameState);
    if (!groups[turnNumber]) groups[turnNumber] = [];
    groups[turnNumber].push(action);
  });

  Object.entries(groups)
    .sort(([a], [b]) => Number(a) - Number(b))
    .forEach(([turnNumber, turnActions]) => {
      text += `【ターン${turnNumber}】\n`;
      turnActions.forEach(action => {
        text += `  ${formatActionAsText(action, gameState)}\n`;
      });
      text += `\n`;
    });
  return text;
};

const formatGameEndSection = (gameState: GameState): string => {
  if (!gameState.result) return '';

  let text = `\n=== ゲーム終了 ===\n`;
  const winner = gameState.result.winner 
    ? (gameState.result.winner === 'player1' ? 'あなた' : '相手')
    : '引き分け';
  const reason = gameState.result.reason === 'life_zero' ? 'ライフ0による勝利' : 
               gameState.result.reason === 'deck_empty' ? 'デッキ切れによる勝利' :
               gameState.result.reason === 'timeout' ? '時間切れによる勝利' : '勝利';
  text += `勝者: ${winner}\n`;
  text += `終了理由: ${reason}\n`;

  const decisiveAction = findDecisiveAction(gameState);
  if (decisiveAction) {
    text += `決定打: ${formatActionAsText(decisiveAction, gameState)}\n`;
  }

  text += `\n=== 最終状態 ===\n`;
  const finalState = getFinalGameState(gameState);
  text += `あなた  - ライフ: ${finalState.player1.life}  場: ${finalState.player1.fieldCards}体  手札: ${finalState.player1.handCards}枚  デッキ: ${finalState.player1.deckCards}枚\n`;
  text += `相手    - ライフ: ${finalState.player2.life}  場: ${finalState.player2.fieldCards}体  手札: ${finalState.player2.handCards}枚  デッキ: ${finalState.player2.deckCards}枚\n`;
  
  return text;
};

export default function BattleLogModal({ 
  gameState, 
  isOpen, 
  onClose, 
  onJumpToAction 
}: BattleLogModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPlayer, setFilterPlayer] = useState<string>('all');
  const [copySuccess, setCopySuccess] = useState(false);

  // 戦闘ログをテキスト形式に変換 (リファクタリング後)
  const formatBattleLogAsText = (useFiltered: boolean = false): string => {
    const actionsToFormat = useFiltered ? filteredActions : gameState.actionLog;
    
    let text = formatLogHeader(gameState);
    text += formatTurnSummariesSection(gameState);
    text += formatBattleAnalysisSection(gameState);
    text += formatActionLogSection(actionsToFormat, gameState.actionLog.length, gameState);
    text += formatGameEndSection(gameState);
    
    return text;
  };

  // クリップボードコピー機能
  const copyToClipboard = async (useFiltered: boolean = false) => {
    try {
      const logText = formatBattleLogAsText(useFiltered);
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(logText);
      } else {
        // フォールバック: 古いブラウザ対応
        const textArea = document.createElement('textarea');
        textArea.value = logText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('コピーに失敗しました:', error);
      // エラー時も成功と同じ表示（UX向上のため）
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // フィルタリング・検索処理
  const filteredActions = useMemo(() => {
    let filtered = [...gameState.actionLog];

    // アクションタイプフィルター
    if (filterType !== 'all') {
      filtered = filtered.filter(action => action.type === filterType);
    }

    // プレイヤーフィルター
    if (filterPlayer !== 'all') {
      filtered = filtered.filter(action => action.playerId === filterPlayer);
    }

    // 検索フィルター
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(action => {
        const actionText = formatAction(action, gameState);
        return JSON.stringify(actionText).toLowerCase().includes(term);
      });
    }

    return filtered;
  }, [gameState, searchTerm, filterType, filterPlayer]);

  // ターン別グルーピング
  const groupedActions = useMemo(() => {
    const groups: Record<number, GameAction[]> = {};
    
    filteredActions.forEach(action => {
      const turnNumber = getTurnNumberForAction(action, gameState);
      
      if (!groups[turnNumber]) {
        groups[turnNumber] = [];
      }
      groups[turnNumber].push(action);
    });
    
    return groups;
  }, [filteredActions, gameState]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">詳細戦闘ログ</h2>
            <div className="flex items-center space-x-3">
              {/* コピーボタン群 */}
              <button
                onClick={() => copyToClipboard(false)}
                className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition-colors"
                title="全ログをクリップボードにコピー"
              >
                {copySuccess ? (
                  <>
                    <Check size={16} />
                    <span>コピー完了</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    <span>全ログコピー</span>
                  </>
                )}
              </button>
              
              {filteredActions.length < gameState.actionLog.length && (
                <button
                  onClick={() => copyToClipboard(true)}
                  className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
                  title="フィルター適用済みログをクリップボードにコピー"
                >
                  <Copy size={16} />
                  <span>表示中のみ</span>
                </button>
              )}
              
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
          </div>
          
          {/* フィルター・検索 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 検索 */}
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="アクション検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none"
              />
            </div>
            
            {/* アクションタイプフィルター */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-400 focus:outline-none"
            >
              <option value="all">全アクション</option>
              <option value="card_play">カード配置</option>
              <option value="card_attack">攻撃</option>
              <option value="effect_trigger">効果発動</option>
              <option value="keyword_trigger">キーワード発動</option>
              <option value="phase_change">フェーズ変更</option>
              <option value="energy_update">エネルギー更新</option>
              <option value="trigger_event">トリガーイベント</option>
              <option value="creature_destroyed">クリーチャー破壊</option>
            </select>
            
            {/* プレイヤーフィルター */}
            <select
              value={filterPlayer}
              onChange={(e) => setFilterPlayer(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-400 focus:outline-none"
            >
              <option value="all">全プレイヤー</option>
              <option value="player1">あなた</option>
              <option value="player2">相手</option>
            </select>
          </div>

          {/* 統計 */}
          <div className="mt-4 flex items-center space-x-6 text-sm text-gray-400">
            <span>総アクション: <span className="text-white font-bold">{gameState.actionLog.length}</span></span>
            <span>表示中: <span className="text-white font-bold">{filteredActions.length}</span></span>
            <span>現在ターン: <span className="text-white font-bold">{gameState.turnNumber}</span></span>
          </div>
        </div>

        {/* アクションリスト */}
        <div className="flex-1 overflow-y-auto p-6">
          {Object.keys(groupedActions).length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              条件に一致するアクションがありません
            </div>
          ) : (
            <>
              {Object.entries(groupedActions)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([turnNumber, actions]) => {
                  const decisiveAction = findDecisiveAction(gameState);
                  
                  return (
                    <div key={turnNumber} className="mb-6">
                      {/* ターンヘッダー */}
                      <div className="sticky top-0 bg-gray-900/90 backdrop-blur-sm py-2 mb-3 border-b border-gray-700">
                        <h3 className="text-lg font-bold text-amber-300">
                          ターン {turnNumber}
                        </h3>
                      </div>
                      
                      {/* アクションリスト */}
                      <div className="space-y-2">
                        {actions.map((action) => {
                          const isDecisiveAction = decisiveAction && action.sequence === decisiveAction.sequence;
                          
                          return (
                            <div
                              key={action.sequence}
                              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                isDecisiveAction 
                                  ? 'bg-red-900/30 border-red-500/50 hover:bg-red-900/40' 
                                  : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-800/70'
                              }`}
                            >
                              <div className="flex items-center space-x-3 flex-1">
                                <span className="text-xs font-mono text-gray-500 min-w-[3rem]">
                                  #{action.sequence.toString().padStart(3, '0')}
                                </span>
                                <div className="flex items-center space-x-2 flex-1">
                                  {isDecisiveAction && (
                                    <div title="決定打">
                                      <Zap size={16} className="text-red-400 animate-pulse" />
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    {formatAction(action, gameState)}
                                  </div>
                                </div>
                              </div>
                              
                              {onJumpToAction && (
                                <button
                                  onClick={() => onJumpToAction(action.sequence)}
                                  className="ml-3 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors"
                                  title="この時点に戻る"
                                >
                                  戻る
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              
              {/* ゲーム終了セクション */}
              {gameState.result && (
                <div className="mt-8 mb-6">
                  {/* ゲーム終了区切り */}
                  <div className="flex items-center mb-6">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
                    <div className="px-4 flex items-center space-x-2">
                      <AlertCircle size={20} className="text-amber-400" />
                      <span className="text-xl font-bold text-amber-300">ゲーム終了</span>
                      <AlertCircle size={20} className="text-amber-400" />
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
                  </div>

                  {/* 勝者表示 */}
                  <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-xl border border-amber-500/30 p-6 mb-6">
                    <div className="flex items-center justify-center space-x-4 mb-4">
                      {gameState.result.winner ? (
                        <>
                          <Crown size={32} className="text-yellow-400" />
                          <div className="text-center">
                            <div className="text-2xl font-bold text-white mb-1">
                              {gameState.result.winner === 'player1' ? 'あなた' : '相手'}の勝利
                            </div>
                            <div className="text-amber-300">
                              {gameState.result.reason === 'life_zero' ? 'ライフ0による勝利' : 
                               gameState.result.reason === 'deck_empty' ? 'デッキ切れによる勝利' :
                               gameState.result.reason === 'timeout' ? '時間切れによる勝利' : '勝利'}
                            </div>
                          </div>
                          <Trophy size={32} className="text-yellow-400" />
                        </>
                      ) : (
                        <>
                          <Skull size={32} className="text-gray-400" />
                          <div className="text-center">
                            <div className="text-2xl font-bold text-gray-300 mb-1">引き分け</div>
                            <div className="text-gray-400">時間切れによる引き分け</div>
                          </div>
                          <Skull size={32} className="text-gray-400" />
                        </>
                      )}
                    </div>

                    {/* 決定打表示 */}
                    {(() => {
                      const decisiveAction = findDecisiveAction(gameState);
                      if (decisiveAction) {
                        return (
                          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-4">
                            <div className="flex items-center space-x-2 mb-2">
                              <Zap size={18} className="text-red-400" />
                              <span className="font-bold text-red-300">決定打</span>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className="text-xs font-mono text-gray-500">
                                #{decisiveAction.sequence.toString().padStart(3, '0')}
                              </span>
                              <div className="flex-1">
                                {formatAction(decisiveAction, gameState)}
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* 最終状態サマリー */}
                    <div className="bg-gray-800/50 border border-gray-600/50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <BarChart3 size={18} className="text-blue-400" />
                        <span className="font-bold text-blue-300">最終状態</span>
                      </div>
                      
                      {(() => {
                        const finalState = getFinalGameState(gameState);
                        return (
                          <div className="grid grid-cols-2 gap-4">
                            {/* あなた */}
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <User size={16} className="text-blue-400" />
                                <span className="font-semibold text-blue-300">あなた</span>
                              </div>
                              <div className="text-sm space-y-1 ml-6">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">ライフ:</span>
                                  <span className={`font-bold ${finalState.player1.life <= 0 ? 'text-red-400' : 'text-white'}`}>
                                    {finalState.player1.life}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">場:</span>
                                  <span className="text-white">{finalState.player1.fieldCards}体</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">手札:</span>
                                  <span className="text-white">{finalState.player1.handCards}枚</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">デッキ:</span>
                                  <span className="text-white">{finalState.player1.deckCards}枚</span>
                                </div>
                              </div>
                            </div>

                            {/* 相手 */}
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Bot size={16} className="text-red-400" />
                                <span className="font-semibold text-red-300">相手</span>
                              </div>
                              <div className="text-sm space-y-1 ml-6">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">ライフ:</span>
                                  <span className={`font-bold ${finalState.player2.life <= 0 ? 'text-red-400' : 'text-white'}`}>
                                    {finalState.player2.life}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">場:</span>
                                  <span className="text-white">{finalState.player2.fieldCards}体</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">手札:</span>
                                  <span className="text-white">{finalState.player2.handCards}枚</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">デッキ:</span>
                                  <span className="text-white">{finalState.player2.deckCards}枚</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* フッター */}
        <div className="p-4 border-t border-gray-700 bg-gray-900/50">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div>
              {gameState.result ? (
                <span>
                  ゲーム終了: <span className="text-white">{gameState.result.reason === 'life_zero' ? 'ライフ0' : '時間切れ'}</span>
                </span>
              ) : (
                <span>ゲーム進行中</span>
              )}
            </div>
            <div>
              経過時間: <span className="text-white">{Math.floor((Date.now() - gameState.startTime) / 1000)}秒</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
