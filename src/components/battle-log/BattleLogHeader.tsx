import React from 'react';
import { X, Copy, Check } from 'lucide-react';

interface BattleLogHeaderProps {
  onClose: () => void;
  copySuccess: boolean;
  onCopy: (useFiltered: boolean) => void;
  isFiltered: boolean;
}

export default function BattleLogHeader({
  onClose,
  copySuccess,
  onCopy,
  isFiltered,
}: BattleLogHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold text-white">詳細戦闘ログ</h2>
      <div className="flex items-center space-x-3">
        <button
          onClick={() => onCopy(false)}
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
        
        {isFiltered && (
          <button
            onClick={() => onCopy(true)}
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
  );
}
