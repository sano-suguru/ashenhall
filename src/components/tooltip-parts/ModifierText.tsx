/**
 * モディファイア表示コンポーネント
 * 
 * 攻撃力・体力のモディファイア値を表示するための再利用可能コンポーネント
 * TooltipCreatureStatsの複雑度削減のために分離
 */

'use client';

import React from 'react';

interface ModifierTextProps {
  modifier: number;
  size?: 'sm' | 'xs';
}

export const ModifierText = ({ modifier, size = 'sm' }: ModifierTextProps) => {
  if (modifier === 0) {
    return null;
  }
  
  return (
    <span className={`text-green-400 text-${size} ml-1`}>
      ({modifier > 0 ? '+' : ''}{modifier})
    </span>
  );
};
