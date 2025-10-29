/**
 * カードツールチップフック
 *
 * カードツールチップの表示状態と位置計算ロジックを提供
 */

'use client';

import { useState, useRef, useCallback } from 'react';

export function useCardTooltip() {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({ opacity: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = useCallback(() => {
    if (tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      const tooltipHeight = 300; // Approximate height of the tooltip
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;

      let top, transform;
      if (spaceAbove > tooltipHeight || spaceAbove > spaceBelow) {
        // Display above
        top = `${rect.top - 8}px`;
        transform = 'translateX(-50%) translateY(-100%)';
      } else {
        // Display below
        top = `${rect.bottom + 8}px`;
        transform = 'translateX(-50%)';
      }

      setTooltipStyle({
        position: 'fixed',
        top,
        left: `${rect.left + rect.width / 2}px`,
        transform,
        opacity: 1,
        transition: 'opacity 0.2s ease-in-out',
      });
    }
    setShowTooltip(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltipStyle((prev) => ({ ...prev, opacity: 0 }));
    // A short delay to allow the fade-out animation to complete
    setTimeout(() => setShowTooltip(false), 200);
  }, []);

  return {
    showTooltip,
    tooltipStyle,
    tooltipRef,
    handleMouseEnter,
    handleMouseLeave,
  };
}
