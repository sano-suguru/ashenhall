/**
 * カード名ツールチップコンポーネント
 *
 * BattleLogModal等でカード名にホバーした際に
 * カード詳細情報をツールチップで表示
 */

'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCardTooltip } from '@/hooks/useCardTooltip';
import { getCardById } from '@/data/cards/base-cards';
import { CardTooltip } from './CardTooltip';

interface CardNameWithTooltipProps {
  cardId: string;
  children: React.ReactNode;
  className?: string;
  showBrackets?: boolean;
}

export default function CardNameWithTooltip({
  cardId,
  children,
  className = '',
  showBrackets = false,
}: CardNameWithTooltipProps) {
  const { showTooltip, tooltipStyle, tooltipRef, handleMouseEnter, handleMouseLeave } =
    useCardTooltip();

  const [isMounted, setIsMounted] = useState(false);
  const card = getCardById(cardId);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!card) {
    // カードが見つからない場合は通常のテキストとして表示
    return <span className={className}>{children}</span>;
  }

  return (
    <>
      <span
        ref={tooltipRef}
        className={`relative cursor-help ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {showBrackets ? `《${children}》` : children}
      </span>

      {isMounted &&
        showTooltip &&
        createPortal(
          <CardTooltip
            card={card}
            isFieldCard={false}
            fieldCard={null}
            tooltipStyle={tooltipStyle}
          />,
          document.body
        )}
    </>
  );
}
