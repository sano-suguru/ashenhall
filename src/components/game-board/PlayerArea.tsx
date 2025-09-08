'use client';

import React from 'react';
import type { PlayerState, GameAction } from '@/types/game';
import CardComponent from '../CardComponent';
import { Bot, User, Heart, Zap, Layers, WalletCards as Wallet, Skull } from 'lucide-react';

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

interface PlayerAreaProps {
  player: PlayerState;
  energyLimit: number;
  isOpponent: boolean;
  currentAttackAction?: GameAction | null;
}

const PlayerStatus: React.FC<{ player: PlayerState; energyLimit: number; isOpponent: boolean }> = ({ player, energyLimit, isOpponent }) => (
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

const PlayerInfo: React.FC<{ player: PlayerState; isOpponent: boolean }> = ({ player, isOpponent }) => {
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

const PlayerArea: React.FC<PlayerAreaProps> = ({ player, energyLimit, isOpponent, currentAttackAction }) => {
  // 攻撃状態を判定するヘルパー関数
  const getCardAttackState = (cardId: string) => {
    if (!currentAttackAction || currentAttackAction.type !== 'card_attack') {
      return { isAttacking: false, isBeingAttacked: false, damageAmount: 0 };
    }

    const attackData = currentAttackAction.data;
    const isAttacking = attackData.attackerCardId === cardId;
    const isBeingAttacked = attackData.targetId === cardId;
    const damageAmount = isBeingAttacked ? attackData.damage : 0;

    return { isAttacking, isBeingAttacked, damageAmount };
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

export default PlayerArea;
