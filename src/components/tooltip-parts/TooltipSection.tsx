'use client';

import React from 'react';

interface TooltipSectionProps {
  title: string;
  icon: React.ElementType;
  colorClass: string;
  children: React.ReactNode;
}

export const TooltipSection = ({ title, icon: Icon, colorClass, children }: TooltipSectionProps) => {
  return (
    <div className="mb-2">
      <div className={`${colorClass} font-semibold mb-1 flex items-center text-xs`}>
        <Icon size={12} className="mr-1" />
        {title}
      </div>
      <div className="grid grid-cols-1 gap-1">
        {children}
      </div>
    </div>
  );
};
