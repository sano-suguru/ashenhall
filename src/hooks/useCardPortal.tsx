/**
 * カードPortalフック
 *
 * CardComponentからPortal処理とマウント状態管理を分離し、
 * 複雑度を削減するためのフック
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

interface UseCardPortalResult {
  portalElement: React.ReactElement | null;
  isMounted: boolean;
}

export function useCardPortal(shouldShow: boolean, children: React.ReactNode): UseCardPortalResult {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Portal要素の生成
  const portalElement = useMemo(() => {
    if (!isMounted || !shouldShow || !children) {
      return null;
    }

    return createPortal(children, document.body);
  }, [isMounted, shouldShow, children]);

  return {
    portalElement,
    isMounted,
  };
}
