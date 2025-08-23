/**
 * ゲームボード - メインゲーム画面
 * 
 * 設計方針:
 * - ゲーム状態を受け取り、リアルタイムで表示更新
 * - 相手エリア、戦闘ログ、自分エリアの3分割レイアウト
 * - レスポンシブ対応でスマホでもプレイ可能
 */

'use client';

import React, { useState, useMemo } from 'react';
import type { GameState, GameAction, PlayerId, EffectAction } from '@/types/game';
import { GAME_CONSTANTS } from '@/types/game';
import CardComponent from './CardComponent';
import BattleLogModal from './BattleLogModal';
import BattlePlaybackControls from './BattlePlaybackControls';
import { getCardById } from '@/data/cards/base-cards';
import { 
  reconstructStateAtSequence, 
  generateBattleReport, 
  generateShareableText 
} from '@/lib/game-state-utils';
import { 
  CreditCard, 
  Zap, 
  Target, 
  Swords, 
  Flag,
  Bot,
  User,
  Trophy,
  X,
  Handshake,
  Heart,
  Shield,
  ArrowUp,
  ArrowDown,
  Users,
  RotateCcw,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Plus,
  Sparkles,
  Play,
  Pause,
  SkipForward,
  FileText,
  Download,
  Share,
  ScrollText,
  Sunrise,
  MicOff,
  Ban,
  Trash2,
  Repeat,
  Skull,
  Layers,
  WalletCards as Wallet, // WalletCards is not available, using Wallet as an alias
} from 'lucide-react';

// StatusDisplayコンポーネント
interface StatusDisplayProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string | number;
  colorClassName?: string;
  sizeClassName?: string;
  iconSize?: number;
}

const StatusDisplay: React.FC<StatusDisplayProps> = ({
  icon: Icon,
  label,
  value,
  colorClassName = 'text-white',
  sizeClassName = 'text-lg',
  iconSize = 18,
}) => (
  <div className="text-center">
    <div className="text-sm text-gray-400">{label}</div>
    <div className={`flex items-center justify-center space-x-1 font-bold ${sizeClassName} ${colorClassName}`}>
      <Icon size={iconSize} className="inline-block" />
      <span>{value}</span>
    </div>
  </div>
);

interface GameBoardProps {
  gameState: GameState;
  onReturnToSetup: () => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTurn: number;
  setCurrentTurn: (turn: number) => void;
  gameSpeed: number;
  setGameSpeed: (speed: number) => void;
}

// フェーズ表示用のデータ
const PHASE_DATA = {
  draw: { name: 'ドロー', icon: CreditCard, color: 'text-blue-400' },
  energy: { name: 'エネルギー', icon: Zap, color: 'text-yellow-400' },
  deploy: { name: '配置', icon: Target, color: 'text-green-400' },
  battle: { name: '戦闘', icon: Swords, color: 'text-red-400' },
  end: { name: '終了', icon: Flag, color: 'text-purple-400' },
} as const;

// 効果アイコンマッピング（lucide-react）
const EFFECT_ICONS: Record<EffectAction, React.ComponentType<{ size?: number; className?: string }>> = {
  damage: Swords,
  heal: Heart,
  buff_attack: TrendingUp,
  buff_health: Shield,
  debuff_attack: TrendingDown,
  debuff_health: ArrowDown,
  summon: Users,
  draw_card: CreditCard,
  resurrect: Sunrise,
  silence: MicOff,
  guard: Shield,
  stun: Ban,
  destroy_deck_top: Trash2,
  swap_attack_health: Repeat,
  hand_discard: Trash2,
  destroy_all_creatures: Skull,
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
  swap_attack_health: '攻/体入替',
  hand_discard: '手札破壊',
  destroy_all_creatures: '全体破壊',
};

// フェーズ名マッピング
const PHASE_NAMES = {
  draw: 'ドロー',
  energy: 'エネルギー',
  deploy: '配置',
  battle: '戦闘',
  end: '終了',
} as const;

// ユーティリティ関数
function getCardName(cardId: string): string {
  const card = getCardById(cardId);
  return card?.name || cardId;
}

function getPlayerName(playerId: PlayerId): string {
  return playerId === 'player1' ? 'あなた' : '相手';
}

// 改善されたアクション表示用の関数（JSX版）
function formatAction(action: GameAction): React.ReactElement {
  const playerName = getPlayerName(action.playerId);
  
  switch (action.type) {
    case 'card_play': {
      const card = getCardById(action.data.cardId);
      return (
        <span className="flex items-center space-x-1">
          <CreditCard size={14} className="text-blue-400" />
          <span>[{playerName}] {card?.name || action.data.cardId}を配置 (コスト{card?.cost || '?'})</span>
        </span>
      );
    }
    
    case 'card_attack': {
      const attackerName = getCardName(action.data.attackerCardId);
      const targetName = action.data.target === 'player' 
        ? 'プレイヤー' 
        : getCardName(action.data.target);
      return (
        <span className="flex items-center space-x-1">
          <Swords size={14} className="text-red-400" />
          <span>[{playerName}] {attackerName} → {targetName} ({action.data.damage}ダメージ)</span>
        </span>
      );
    }
    
    case 'effect_trigger': {
      const { data } = action;
      const EffectIcon = EFFECT_ICONS[data.effectType] || Sparkles;
      const effectName = EFFECT_NAMES[data.effectType] || data.effectType;
      const sourceCard = getCardName(data.sourceCardId);

      // 特殊ケース: デッキ切れ
      if (data.sourceCardId === 'deck_empty') {
        const prev = data.previousValues?.[action.playerId]?.health;
        const next = data.newValues?.[action.playerId]?.health;
        const detail = prev !== undefined && next !== undefined ? ` (${prev} → ${next})` : '';
        return (
          <span className="flex items-center space-x-1">
            <AlertTriangle size={14} className="text-orange-400" />
            <span>[{playerName}] デッキ切れ: {data.effectValue}ダメージ{detail}</span>
          </span>
        );
      }
      
      const targetDetails = data.targetCardIds.map(id => {
        const targetName = id.startsWith('player') ? getPlayerName(id as PlayerId) : getCardName(id);
        const prev = data.previousValues?.[id];
        const next = data.newValues?.[id];
        
        if (prev?.health !== undefined && next?.health !== undefined) {
          return `${targetName}の体力 (${prev.health} → ${next.health})`;
        }
        if (prev?.attack !== undefined && next?.attack !== undefined) {
          return `${targetName}の攻撃力 (${prev.attack} → ${next.attack})`;
        }
        return targetName;
      }).join(', ');

      return (
        <span className="flex items-center space-x-1">
          <EffectIcon size={14} className="text-purple-400" />
          <span>
            [効果] {sourceCard}: {effectName} ({data.effectValue}) → {targetDetails}
          </span>
        </span>
      );
    }
    
    case 'phase_change': {
      const toPhase = PHASE_NAMES[action.data.toPhase as keyof typeof PHASE_NAMES] || action.data.toPhase;
      
      // フェーズ変更はより簡潔に表示
      if (action.data.toPhase === 'draw') {
        return (
          <span className="flex items-center space-x-1">
            <RotateCcw size={14} className="text-green-400" />
            <span>ターン{Math.floor((action.sequence + 1) / 5) + 1}開始</span>
          </span>
        );
      }
      const PhaseIcon = PHASE_DATA[action.data.toPhase as keyof typeof PHASE_DATA]?.icon || Flag;
      return (
        <span className="flex items-center space-x-1">
          <PhaseIcon size={14} className="text-gray-400" />
          <span>{toPhase}フェーズ</span>
        </span>
      );
    }
    
    default:
      return (
        <span className="flex items-center space-x-1">
          <AlertTriangle size={14} className="text-yellow-400" />
          <span>不明なアクション</span>
        </span>
      );
  }
}

export default function GameBoard({ 
  gameState, 
  onReturnToSetup, 
  isPlaying,
  setIsPlaying,
  currentTurn,
  setCurrentTurn,
  gameSpeed,
  setGameSpeed
}: GameBoardProps) {
  const [showLog, setShowLog] = useState(false);
  const [showDetailedLog, setShowDetailedLog] = useState(false);
  const [showBattleReport, setShowBattleReport] = useState(false);
  
  // ヘルパー関数群（useMemoより前に定義）
  // ターン番号からシーケンス番号を計算
  const calculateSequenceForTurn = (gameState: GameState, targetTurn: number): number => {
    if (targetTurn <= 0) return -1;
    
    // ターン開始のアクションを探す（初期状態sequence 0を除外）
    let currentTurnInLog = 1;
    for (let i = 0; i < gameState.actionLog.length; i++) {
      const action = gameState.actionLog[i];
      
      if (action.type === 'phase_change' && action.data.toPhase === 'draw' && action.sequence > 0) {
        if (currentTurnInLog === targetTurn) {
          // 対象ターンの開始直前のsequenceを返す
          return action.sequence - 1;
        } else if (currentTurnInLog > targetTurn) {
          // 対象ターンを越えた場合、前のターンの終了sequenceを返す
          return i > 0 ? gameState.actionLog[i - 1].sequence : -1;
        }
        
        currentTurnInLog++;
      }
    }
    
    // 対象ターンが見つからない場合は最後のsequenceを返す
    return gameState.actionLog[gameState.actionLog.length - 1]?.sequence || -1;
  };

  // シーケンス番号からターン番号を計算
  const calculateTurnFromSequence = (gameState: GameState, targetSequence: number): number => {
    if (targetSequence <= 0) return 0;
    
    let currentTurn = 0;
    for (let i = 0; i < gameState.actionLog.length; i++) {
      const action = gameState.actionLog[i];
      if (action.sequence > targetSequence) break;
      
      if (action.type === 'phase_change' && action.data.toPhase === 'draw') {
        currentTurn = Math.floor((action.sequence + 1) / 5) + 1;
      }
    }
    
    return currentTurn;
  };
  
  // 表示状態の計算（YouTube風統一管理）
  const displayState = useMemo(() => {
    // currentTurn が -1 の場合は最新状態
    if (currentTurn === -1) {
      return gameState;
    }
    
    // 指定ターンの状態を復元
    const targetSequence = calculateSequenceForTurn(gameState, currentTurn);
    return reconstructStateAtSequence(gameState, targetSequence);
  }, [gameState, currentTurn]);
  
  // 現在のターンにおけるエネルギー上限を計算
  const currentEnergyLimit = Math.min(displayState.turnNumber, GAME_CONSTANTS.ENERGY_LIMIT);
  
  const player1 = displayState.players.player1;
  const player2 = displayState.players.player2;
  const currentPhase = PHASE_DATA[displayState.phase];
  const currentPlayerName = displayState.currentPlayer === 'player1' ? 'あなた' : '相手';

  // 最新のアクションログ（表示用）
  const recentActions = displayState.actionLog.slice(-10).reverse();

  // 詳細ログからのジャンプアクション（新しい状態管理に対応）
  const handleJumpToAction = (sequence: number) => {
    // シーケンス番号からターン番号を逆算
    const targetTurn = calculateTurnFromSequence(gameState, sequence);
    setCurrentTurn(targetTurn);
    setIsPlaying(false); // 自動一時停止
    setShowDetailedLog(false);
  };

  // テキストレポート生成
  const handleGenerateReport = () => {
    const report = generateBattleReport(gameState);
    
    // テキストをクリップボードにコピー
    navigator.clipboard.writeText(report).then(() => {
      alert('戦闘レポートをクリップボードにコピーしました！');
    }).catch(() => {
      // フォールバック: テキストエリアに表示
      setShowBattleReport(true);
    });
  };

  // SNS共有テキスト生成
  const handleShareResult = () => {
    const shareText = generateShareableText(gameState);
    
    navigator.clipboard.writeText(shareText).then(() => {
      alert('共有用テキストをクリップボードにコピーしました！');
    }).catch(() => {
      alert(shareText);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* ヘッダー */}
      <div className="bg-gray-800/90 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onReturnToSetup}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
            >
              ← 戻る
            </button>
            <h1 className="text-2xl font-bold">ASHENHALL</h1>
          </div>
          
          {/* ターン・フェーズ情報 */}
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className="text-sm text-gray-400">ターン</div>
              <div className="text-xl font-bold">{gameState.turnNumber}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-400">フェーズ</div>
              <div className={`flex items-center space-x-2 ${currentPhase.color}`}>
                <currentPhase.icon size={18} />
                <span className="font-bold">{currentPhase.name}</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-400">手番</div>
              <div className="font-bold">{currentPlayerName}</div>
            </div>
          </div>


          {/* ログ表示トグル */}
          <button
            onClick={() => setShowLog(!showLog)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
          >
            ログ {showLog ? '非表示' : '表示'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-120px)]">
          
          {/* メインゲームエリア */}
          <div className="lg:col-span-3 flex flex-col space-y-4">
            
            {/* 相手エリア */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              {/* 相手プレイヤー情報 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                    <Bot size={24} className="text-white" />
                  </div>
                  <div>
                    <div className="font-bold">AI対戦相手</div>
                    <div className="text-sm text-gray-400">
                      {player2.faction} × {player2.tacticsType}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6">
                  <StatusDisplay 
                    icon={Heart} 
                    label="ライフ" 
                    value={player2.life} 
                    colorClassName={player2.life <= 5 ? 'text-red-400' : 'text-green-400'}
                    sizeClassName="text-2xl"
                    iconSize={22}
                  />
                  <StatusDisplay 
                    icon={Zap} 
                    label="エネルギー" 
                    value={`${player2.energy}/${currentEnergyLimit}`} 
                    colorClassName="text-blue-400"
                    sizeClassName="text-xl"
                    iconSize={20}
                  />
                  <StatusDisplay 
                    icon={Layers} 
                    label="デッキ" 
                    value={player2.deck.length} 
                    colorClassName="text-purple-400"
                  />
                  <StatusDisplay 
                    icon={Wallet} 
                    label="手札" 
                    value={player2.hand.length} 
                    colorClassName="text-yellow-400"
                  />
                </div>
              </div>

              {/* 相手の場 */}
              <div className="mb-2">
                <div className="text-sm text-gray-400 mb-2">相手の場 ({player2.field.length}/5)</div>
                <div className="flex justify-center space-x-2 min-h-[112px]">
                  {player2.field.length === 0 ? (
                    <div className="flex items-center justify-center text-gray-500 text-sm">
                      場にカードがありません
                    </div>
                  ) : (
                    player2.field.map((card, index) => (
                      <CardComponent
                        key={`opponent-${card.id}-${index}`}
                        card={card}
                        isFieldCard={true}
                        isOpponent={true}
                        size="medium"
                      />
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* 戦闘ログエリア（表示時のみ） */}
            {showLog && (
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 max-h-40 overflow-y-auto">
                <h3 className="text-lg font-bold mb-2">戦闘ログ</h3>
                <div className="space-y-1 text-sm">
                  {recentActions.length === 0 ? (
                    <div className="text-gray-500">ログがありません</div>
                  ) : (
                    recentActions.map((action, index) => (
                      <div key={action.sequence} className="text-gray-300">
                        <span className="text-gray-500">#{action.sequence}</span>
                        <span className="ml-2">{formatAction(action)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 自分エリア */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 flex-1">
              {/* 自分の場 */}
              <div className="mb-4">
                <div className="text-sm text-gray-400 mb-2">あなたの場 ({player1.field.length}/5)</div>
                <div className="flex justify-center space-x-2 min-h-[112px]">
                  {player1.field.length === 0 ? (
                    <div className="flex items-center justify-center text-gray-500 text-sm">
                      場にカードがありません
                    </div>
                  ) : (
                    player1.field.map((card, index) => (
                      <CardComponent
                        key={`player-${card.id}-${index}`}
                        card={card}
                        isFieldCard={true}
                        isOpponent={false}
                        size="medium"
                      />
                    ))
                  )}
                </div>
              </div>

              {/* 自分の手札 */}
              <div className="mb-4">
                <div className="text-sm text-gray-400 mb-2">手札 ({player1.hand.length}/7)</div>
                <div className="flex justify-center space-x-2 flex-wrap">
                  {player1.hand.length === 0 ? (
                    <div className="flex items-center justify-center text-gray-500 text-sm h-28">
                      手札がありません
                    </div>
                  ) : (
                    player1.hand.map((card, index) => (
                      <CardComponent
                        key={`hand-${card.id}-${index}`}
                        card={card}
                        isFieldCard={false}
                        isOpponent={false}
                        size="medium"
                      />
                    ))
                  )}
                </div>
              </div>

              {/* 自分プレイヤー情報 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                    <User size={24} className="text-white" />
                  </div>
                  <div>
                    <div className="font-bold">あなた</div>
                    <div className="text-sm text-gray-400">
                      {player1.faction} × {player1.tacticsType}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6">
                  <StatusDisplay 
                    icon={Heart} 
                    label="ライフ" 
                    value={player1.life} 
                    colorClassName={player1.life <= 5 ? 'text-red-400' : 'text-green-400'}
                    sizeClassName="text-2xl"
                    iconSize={22}
                  />
                  <StatusDisplay 
                    icon={Zap} 
                    label="エネルギー" 
                    value={`${player1.energy}/${currentEnergyLimit}`} 
                    colorClassName="text-blue-400"
                    sizeClassName="text-xl"
                    iconSize={20}
                  />
                  <StatusDisplay 
                    icon={Layers} 
                    label="デッキ" 
                    value={player1.deck.length} 
                    colorClassName="text-purple-400"
                  />
                  <StatusDisplay 
                    icon={Skull} 
                    label="墓地" 
                    value={player1.graveyard.length} 
                    colorClassName="text-gray-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* サイドバー（統計・結果表示） */}
          <div className="lg:col-span-1 space-y-4">
            {/* ゲーム結果（終了時のみ） */}
            {gameState.result && (
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-4 border border-purple-400">
                <h3 className="text-xl font-bold mb-2 text-center">ゲーム終了</h3>
                <div className="text-center space-y-2">
                  <div className="text-2xl font-bold flex items-center justify-center space-x-2">
                    {gameState.result.winner === 'player1' ? (
                      <><Trophy className="text-yellow-400" size={24} /> <span>あなたの勝利!</span></>
                    ) : gameState.result.winner === 'player2' ? (
                      <><X className="text-red-400" size={24} /> <span>相手の勝利</span></>
                    ) : (
                      <><Handshake className="text-blue-400" size={24} /> <span>引き分け</span></>
                    )}
                  </div>
                  <div className="text-sm text-gray-200">
                    理由: {gameState.result.reason === 'life_zero' ? 'ライフ0' : 
                           gameState.result.reason === 'timeout' ? '時間切れ' : 
                           gameState.result.reason}
                  </div>
                  <div className="text-sm text-gray-200">
                    ターン数: {gameState.result.totalTurns}
                  </div>
                  <div className="text-sm text-gray-200">
                    時間: {gameState.result.durationSeconds}秒
                  </div>
                  <button
                    onClick={onReturnToSetup}
                    className="mt-4 px-4 py-2 bg-white text-purple-600 font-bold rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    新しいゲーム
                  </button>
                </div>
              </div>
            )}

            {/* ゲーム進行情報 */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-bold mb-3">ゲーム情報</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">経過時間</span>
                  <span>{Math.floor((Date.now() - gameState.startTime) / 1000)}秒</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">総アクション</span>
                  <span>{gameState.actionLog.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">現在フェーズ</span>
                  <span className={currentPhase.color}>{currentPhase.name}</span>
                </div>
              </div>
            </div>

            {/* 戦闘再生コントロール */}
            <BattlePlaybackControls
              isPlaying={isPlaying}
              currentTurn={currentTurn}
              maxTurn={gameState.turnNumber}
              gameSpeed={gameSpeed}
              onPlayPause={() => setIsPlaying(!isPlaying)}
              onTurnChange={(turn) => {
                setCurrentTurn(turn);
                // スライダー操作時は自動一時停止
                if (isPlaying && turn < gameState.turnNumber) {
                  setIsPlaying(false);
                }
              }}
              onSpeedChange={setGameSpeed}
              onJumpToStart={() => setCurrentTurn(0)}
              onJumpToEnd={() => setCurrentTurn(-1)}
              isGameFinished={!!gameState.result}
            />

            {/* 戦闘分析・共有 */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-bold mb-3">戦闘分析</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowDetailedLog(true)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors text-white"
                >
                  <ScrollText size={16} />
                  <span>詳細ログを見る</span>
                </button>
                
                {gameState.result && (
                  <>
                    <button
                      onClick={handleGenerateReport}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg transition-colors text-white"
                    >
                      <FileText size={16} />
                      <span>戦闘レポート</span>
                    </button>
                    
                    <button
                      onClick={handleShareResult}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors text-white"
                    >
                      <Share size={16} />
                      <span>結果を共有</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 操作ヒント */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-bold mb-3">操作ガイド</h3>
              <div className="space-y-2 text-sm text-gray-300">
                <div>• ゲームは自動で進行します</div>
                <div>• AIが戦術に基づいてカードを配置</div>
                <div>• 戦闘再生コントロールで過去状態を確認</div>
                <div>• 詳細ログで戦闘分析が可能</div>
                {currentTurn !== -1 && currentTurn < gameState.turnNumber && (
                  <div className="text-blue-300 font-semibold">
                    📺 過去のターン表示中 (T{currentTurn})
                  </div>
                )}
                {!isPlaying && (
                  <div className="text-yellow-300 font-semibold">
                    ⏸️ 一時停止中
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* モーダルダイアログ */}
      <BattleLogModal
        gameState={gameState}
        isOpen={showDetailedLog}
        onClose={() => setShowDetailedLog(false)}
        onJumpToAction={handleJumpToAction}
      />

      {/* 戦闘レポート表示（フォールバック） */}
      {showBattleReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">戦闘レポート</h2>
              <button
                onClick={() => setShowBattleReport(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-96">
              <textarea
                readOnly
                value={generateBattleReport(gameState)}
                className="w-full h-80 bg-gray-800 border border-gray-600 rounded-lg p-4 text-white font-mono text-sm"
                onClick={(e) => e.currentTarget.select()}
              />
              <p className="text-sm text-gray-400 mt-2 text-center">
                テキストをクリックして全選択できます
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
