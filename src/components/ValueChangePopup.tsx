/**
 * 値変化ポップアップコンポーネント
 * 
 * 設計方針:
 * - ライフ/エネルギーの増減を視覚的に表示
 * - ポップアップアニメーション後に自動消滅
 * - 増加/減少で色とアイコンを変更
 */

'use client';

import React, { useEffect, useState } from 'react';
import { TrendingDown, Zap, Heart } from 'lucide-react';

export type ValueChangeType = 'life-gain' | 'life-loss' | 'energy-gain';

interface ValueChangePopupProps {
  type: ValueChangeType;
  value: number;
  position?: { x: number; y: number };
  isVisible: boolean;
  onComplete?: () => void;
}

export default function ValueChangePopup({ 
  type, 
  value, 
  position = { x: 0, y: 0 },
  isVisible,
  onComplete 
}: ValueChangePopupProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible && value !== 0) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        onComplete?.();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isVisible, value, onComplete]);

  if (!show || value === 0) return null;

  const config = getTypeConfig(type);

  return (
    <div 
      className="fixed z-50 pointer-events-none"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)'
      }}
    >
      <div className={`value-change-popup flex items-center space-x-2 px-4 py-2 rounded-lg font-bold text-2xl ${config.bg} ${config.text} border-2 ${config.border} shadow-xl`}>
        <config.icon size={24} />
        <span>{config.prefix}{Math.abs(value)}</span>
      </div>
    </div>
  );
}

function getTypeConfig(type: ValueChangeType) {
  switch (type) {
    case 'life-gain':
      return {
        icon: Heart,
        prefix: '+',
        bg: 'bg-green-600',
        text: 'text-white',
        border: 'border-green-400',
      };
    case 'life-loss':
      return {
        icon: TrendingDown,
        prefix: '-',
        bg: 'bg-red-600',
        text: 'text-white',
        border: 'border-red-400',
      };
    case 'energy-gain':
      return {
        icon: Zap,
        prefix: '+',
        bg: 'bg-blue-600',
        text: 'text-white',
        border: 'border-blue-400',
      };
  }
}
