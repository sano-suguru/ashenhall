'use client';

import React, { useState, useEffect } from 'react';
import type { GameState, GameAction } from '@/types/game';
import { loadStats, saveStats, updateStatsWithGameResult } from '@/lib/stats-utils';
import { GAME_CONSTANTS } from '@/types/game';
import BattleLogModal from './BattleLogModal';
// 旧game-board/ディレクトリのコンポーネントを内部統合
import type { PlayerId, GamePhase, PlayerState } from '@/types/game';
import { CreditCard, Zap, Target, Swords, Flag, Handshake, ScrollText, Share, Trophy, X, FileText, Bot, User, Heart, Shield, ArrowDown, Users, Sparkles, RotateCcw, MicOff, AlertCircle, Skull, Repeat, Trash2, ShieldOff, AlertTriangle, Star, TrendingUp, TrendingDown, Layers, WalletCards as Wallet } from 'lucide-react';
import { getLogDisplayParts, generateBattleReport, generateShareableText } from '@/lib/game-state-utils';
import { getCardById } from '@/data/cards/base-cards';
import CardNameWithTooltip from './CardNameWithTooltip';
import CardComponent from './CardComponent';
import BattlePlaybackControls from './BattlePlaybackControls';
import DestroyedCardGhost from './DestroyedCardGhost';

interface GameBoardProps {
  gameState: GameState;
  onReturnToSetup: () => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTurn: number;
  setCurrentTurn: (turn: number) => void;
  gameSpeed: number;
  setGameSpeed: (speed: number) => void;
  currentAttackAction?: GameAction | null;
  getCardAnimationState?: (cardId: string) => {
    isAttacking: boolean;
    isBeingAttacked: boolean;
    isDying: boolean;
    damageAmount: number;
  };
  currentAnimationState?: {
    isAnimating: boolean;
    animationType: 'attack' | 'damage' | 'destroy' | 'none';
    sourceCardId?: string;
    targetCardId?: string;
    destroySnapshot?: {
      id: string;
      owner: string;
      name: string;
      attackTotal: number;
      healthTotal: number;
      currentHealth: number;
      baseAttack: number;
      baseHealth: number;
      keywords: string[];
    };
  };
}

// === 内部コンポーネント定義（旧game-board/ディレクトリから統合） ===

/**
 * GameHeader - ゲームヘッダー部分
 */
const PHASE_DATA = {
  draw: { name: 'ドロー', icon: CreditCard, color: 'text-blue-400' },
  energy: { name: 'エネルギー', icon: Zap, color: 'text-yellow-400' },
  deploy: { name: '配置', icon: Target, color: 'text-green-400' },
  battle: { name: '戦闘', icon: Swords, color: 'text-red-400' },
  battle_attack: { name: '攻撃', icon: Swords, color: 'text-red-500' },
  end: { name: '終了', icon: Flag, color: 'text-purple-400' },
} as const;

const GameHeader = ({ turnNumber, phase, currentPlayerId, isLogVisible, onReturnToSetup, onToggleLog }: {
  turnNumber: number;
  phase: GamePhase;
  currentPlayerId: PlayerId;
  isLogVisible: boolean;
  onReturnToSetup: () => void;
  onToggleLog: () => void;
}) => {
  const currentPhase = PHASE_DATA[phase];
  const currentPlayerName = currentPlayerId === 'player1' ? 'あなた' : '相手';

  return (
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
        
        <div className="flex items-center space-x-6">
          <div className="text-center">
            <div className="text-sm text-gray-400">ターン</div>
            <div className="text-xl font-bold">{turnNumber}</div>
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

        <button
          onClick={onToggleLog}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
        >
          ログ {isLogVisible ? '非表示' : '表示'}
        </button>
      </div>
    </div>
  );
};

/**
 * GameSidebar - ゲームサイドバー部分
 */
const GameSidebar = ({ gameState, isPlaying, setIsPlaying, currentTurn, setCurrentTurn, gameSpeed, setGameSpeed, onShowDetailedLog, onReturnToSetup }: {
  gameState: GameState;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTurn: number;
  setCurrentTurn: (turn: number) => void;
  gameSpeed: number;
  setGameSpeed: (speed: number) => void;
  onShowDetailedLog: () => void;
  onReturnToSetup: () => void;
}) => {
  const handleGenerateReport = () => {
    const report = generateBattleReport(gameState);
    navigator.clipboard.writeText(report).then(() => {
      alert('戦闘レポートをクリップボードにコピーしました！');
    }).catch(() => {
      alert('クリップボードへのコピーに失敗しました。');
    });
  };

  const handleShareResult = () => {
    const shareText = generateShareableText(gameState);
    navigator.clipboard.writeText(shareText).then(() => {
      alert('共有用テキストをクリップボードにコピーしました！');
    }).catch(() => {
      alert(shareText);
    });
  };

  return (
    <div className="lg:col-span-1 space-y-4">
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
              理由: {gameState.result.reason === 'life_zero' ? 'ライフ0' : gameState.result.reason}
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

      <BattlePlaybackControls
        isPlaying={isPlaying}
        currentTurn={currentTurn}
        maxTurn={gameState.turnNumber}
        gameSpeed={gameSpeed}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        onTurnChange={(turn) => {
          setCurrentTurn(turn);
          if (isPlaying && turn < gameState.turnNumber) {
            setIsPlaying(false);
          }
        }}
        onSpeedChange={setGameSpeed}
        onJumpToStart={() => setCurrentTurn(0)}
        onJumpToEnd={() => setCurrentTurn(-1)}
        isGameFinished={!!gameState.result}
      />

      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-bold mb-3">戦闘分析</h3>
        <div className="space-y-3">
          <button
            onClick={onShowDetailedLog}
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
    </div>
  );
};

/**
 * PlayerArea - プレイヤーエリア部分
 */
const StatusDisplay = ({ icon: Icon, label, value, colorClassName = 'text-white', sizeClassName = 'text-lg', iconSize = 18 }: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string | number;
  colorClassName?: string;
  sizeClassName?: string;
  iconSize?: number;
}) => (
  <div className="text-center">
    <div className="text-sm text-gray-400">{label}</div>
    <div className={`flex items-center justify-center space-x-1 font-bold ${sizeClassName} ${colorClassName}`}>
      <Icon size={iconSize} className="inline-block" />
      <span>{value}</span>
    </div>
  </div>
);

const PlayerStatus = ({ player, energyLimit, isOpponent }: { player: PlayerState; energyLimit: number; isOpponent: boolean }) => (
  <div className="flex items-center space-x-6">
    <StatusDisplay 
      icon={Heart} 
      label="ライフ" 
      value={player.life} 
      colorClassName={player.life <= 5 ? 'text-red-400' : 'text-green-400'}
      sizeClassName="text-2xl"
      iconSize={22}
    />
    <StatusDisplay 
      icon={Zap} 
      label="エネルギー" 
      value={`${player.energy}/${energyLimit}`} 
      colorClassName="text-blue-400"
      sizeClassName="text-xl"
      iconSize={20}
    />
    <StatusDisplay 
      icon={Layers} 
      label="デッキ" 
      value={player.deck.length} 
      colorClassName="text-purple-400"
    />
    {isOpponent ? (
      <StatusDisplay 
        icon={Wallet} 
        label="手札" 
        value={player.hand.length} 
        colorClassName="text-yellow-400"
      />
    ) : (
      <StatusDisplay 
        icon={Skull} 
        label="墓地" 
        value={player.graveyard.length} 
        colorClassName="text-gray-400"
      />
    )}
  </div>
);

const PlayerInfo = ({ player, isOpponent }: { player: PlayerState; isOpponent: boolean }) => {
  const PlayerIcon = isOpponent ? Bot : User;
  const iconBgColor = isOpponent ? 'bg-red-600' : 'bg-blue-600';

  return (
    <div className="flex items-center space-x-4">
      <div className={`w-12 h-12 ${iconBgColor} rounded-full flex items-center justify-center`}>
        <PlayerIcon size={24} className="text-white" />
      </div>
      <div>
        <div className="font-bold">{isOpponent ? 'AI対戦相手' : 'あなた'}</div>
        <div className="text-sm text-gray-400">
          {player.faction} × {player.tacticsType}
        </div>
      </div>
    </div>
  );
};

const PlayerArea = ({ player, energyLimit, isOpponent, currentAttackAction, getCardAnimationState }: {
  player: PlayerState;
  energyLimit: number;
  isOpponent: boolean;
  currentAttackAction?: GameAction | null;
  getCardAnimationState?: (cardId: string) => {
    isAttacking: boolean;
    isBeingAttacked: boolean;
    isDying: boolean;
    damageAmount: number;
  };
}) => {
  // 攻撃状態を判定するヘルパー関数（新アニメーションシステム統合版）
  const getCardAttackState = (cardId: string) => {
    // 新しいアニメーションシステムを優先使用
    if (getCardAnimationState) {
      return getCardAnimationState(cardId);
    }
    
    // 従来システムとの後方互換性（段階的廃止予定）
    if (!currentAttackAction || currentAttackAction.type !== 'card_attack') {
      return { isAttacking: false, isBeingAttacked: false, isDying: false, damageAmount: 0 };
    }

    const attackData = currentAttackAction.data;
    const isAttacking = attackData.attackerCardId === cardId;
    const isBeingAttacked = attackData.targetId === cardId;
    const damageAmount = isBeingAttacked ? attackData.damage : 0;

    return { isAttacking, isBeingAttacked, isDying: false, damageAmount };
  };

  const playerInfo = (
    <div className="flex items-center justify-between mb-4">
      <PlayerInfo player={player} isOpponent={isOpponent} />
      <PlayerStatus player={player} energyLimit={energyLimit} isOpponent={isOpponent} />
    </div>
  );

  const fieldArea = (
    <div className="mb-2">
      <div className="text-sm text-gray-400 mb-2">{isOpponent ? '相手' : 'あなた'}の場 ({player.field.length}/5)</div>
      <div className="flex justify-center space-x-2 min-h-[112px]">
        {player.field.length === 0 ? (
          <div className="flex items-center justify-center text-gray-500 text-sm">
            場にカードがありません
          </div>
        ) : (
          player.field.map((card, index) => {
            const attackState = getCardAttackState(card.id);
            return (
              <CardComponent
                key={`${player.id}-field-${card.id}-${index}`}
                card={card}
                isFieldCard={true}
                isOpponent={isOpponent}
                size="medium"
                isAttacking={attackState.isAttacking}
                isBeingAttacked={attackState.isBeingAttacked}
                damageAmount={attackState.damageAmount}
                isDying={attackState.isDying}
              />
            );
          })
        )}
      </div>
    </div>
  );

  const handArea = !isOpponent && (
    <div className="mb-4">
      <div className="text-sm text-gray-400 mb-2">手札 ({player.hand.length}/7)</div>
      <div className="flex justify-center space-x-2 flex-wrap">
        {player.hand.length === 0 ? (
          <div className="flex items-center justify-center text-gray-500 text-sm h-28">
            手札がありません
          </div>
        ) : (
          player.hand.map((card, index) => (
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
  );

  if (isOpponent) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        {playerInfo}
        {fieldArea}
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 flex-1 flex flex-col">
      <div className="flex-1">
        {fieldArea}
      </div>
      {handArea}
      {playerInfo}
    </div>
  );
};

/**
 * RecentLog - 最近のログ表示部分
 */
const ICONS = {
  CreditCard, Zap, Target, Swords, Flag,
  TrendingUp, TrendingDown, Heart, Shield, ArrowDown, Users, Sparkles,
  RotateCcw, MicOff, AlertCircle, Skull, Repeat, Trash2, ShieldOff,
  AlertTriangle, Star,
} as const;

function formatAction(action: GameAction, gameState: GameState): React.ReactElement {
  const parts = getLogDisplayParts(action, gameState);
  const IconComponent = ICONS[parts.iconName as keyof typeof ICONS] || AlertTriangle;

  const messageWithTooltips = parts.message.split(/(《.*?》)/g).map((segment, index) => {
    if (segment.startsWith('《') && segment.endsWith('》')) {
      const cardName = segment.substring(1, segment.length - 1);
      const cardId = parts.cardIds.find(id => getCardById(id)?.name === cardName);
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
    <span className="flex items-center space-x-1.5">
      <IconComponent size={14} />
      <span>
        <span className="font-semibold">[{parts.playerName}]</span> {messageWithTooltips}
        {parts.details && <span className="text-gray-400 ml-1">{parts.details}</span>}
      </span>
    </span>
  );
}

const RecentLog = ({ actions, gameState }: { actions: GameAction[]; gameState: GameState }) => {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 max-h-40 overflow-y-auto">
      <h3 className="text-lg font-bold mb-2">戦闘ログ</h3>
      <div className="space-y-1 text-sm">
        {actions.length === 0 ? (
          <div className="text-gray-500">ログがありません</div>
        ) : (
          actions.map((action) => (
            <div key={action.sequence} className="text-gray-300 flex items-center space-x-2">
              <span className="text-xs font-mono text-gray-500">#{action.sequence.toString().padStart(3, '0')}</span>
              {formatAction(action, gameState)}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// === メインコンポーネント ===

export default function GameBoard({ 
  gameState, 
  onReturnToSetup, 
  isPlaying,
  setIsPlaying,
  currentTurn,
  setCurrentTurn,
  gameSpeed,
  setGameSpeed,
  currentAttackAction,
  getCardAnimationState,
  currentAnimationState
}: GameBoardProps) {
  const [showLog, setShowLog] = useState(false);
  const [showDetailedLog, setShowDetailedLog] = useState(false);

  // Phase C: 状態管理統一 - displayState計算はuseGameProgressに移譲
  const displayState = gameState; // page.tsxから既に処理済みのdisplayStateを受け取る

  const currentEnergyLimit = Math.min(displayState.turnNumber, GAME_CONSTANTS.ENERGY_LIMIT);
  const recentActions = displayState.actionLog.slice(-10).reverse();

  const calculateTurnFromSequence = (gs: GameState, targetSequence: number): number => {
    if (targetSequence <= 0) return 1;
    let turnNumber = 1;
    for (const action of gs.actionLog) {
      if (action.sequence > targetSequence) break;
      if (action.type === 'phase_change' && action.data.toPhase === 'draw' && action.sequence > 0) {
        turnNumber++;
      }
    }
    return turnNumber;
  };

  const handleJumpToAction = (sequence: number) => {
    const targetTurn = calculateTurnFromSequence(gameState, sequence);
    setCurrentTurn(targetTurn);
    setIsPlaying(false);
    setShowDetailedLog(false);
  };


  useEffect(() => {
    if (gameState.result) {
      const currentStats = loadStats();
      const updatedStats = updateStatsWithGameResult(currentStats, gameState);
      saveStats(updatedStats);
    }
  }, [gameState]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <GameHeader
        turnNumber={displayState.turnNumber}
        phase={displayState.phase}
        currentPlayerId={displayState.currentPlayer}
        isLogVisible={showLog}
        onReturnToSetup={onReturnToSetup}
        onToggleLog={() => setShowLog(!showLog)}
      />

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-120px)]">
          
          <div className="lg:col-span-3 flex flex-col space-y-4 relative">
            <PlayerArea 
              player={displayState.players.player2} 
              energyLimit={currentEnergyLimit} 
              isOpponent={true}
              currentAttackAction={currentAttackAction}
              getCardAnimationState={getCardAnimationState}
            />
            {showLog && <RecentLog actions={recentActions} gameState={gameState} />}
            <PlayerArea 
              player={displayState.players.player1} 
              energyLimit={currentEnergyLimit} 
              isOpponent={false}
              currentAttackAction={currentAttackAction}
              getCardAnimationState={getCardAnimationState}
            />
            {/* 破壊アニメーション中のゴースト表示 (displayState側では既に除去済み) */}
            {currentAnimationState?.animationType === 'destroy' && currentAnimationState.destroySnapshot && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <DestroyedCardGhost snapshot={currentAnimationState.destroySnapshot} />
              </div>
            )}
          </div>

          <GameSidebar
            gameState={gameState}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            currentTurn={currentTurn}
            setCurrentTurn={setCurrentTurn}
            gameSpeed={gameSpeed}
            setGameSpeed={setGameSpeed}
            onShowDetailedLog={() => setShowDetailedLog(true)}
            onReturnToSetup={onReturnToSetup}
          />
        </div>
      </div>

      <BattleLogModal
        gameState={gameState}
        isOpen={showDetailedLog}
        onClose={() => setShowDetailedLog(false)}
        onJumpToAction={handleJumpToAction}
      />
    </div>
  );
}
