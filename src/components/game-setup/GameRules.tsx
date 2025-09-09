/**
 * ゲームルール表示コンポーネント
 * GameSetupからルール表示部分を抽出
 */

'use client';

import { GAME_CONSTANTS } from '@/types/game';

export default function GameRules() {
  return (
    <section className="relative z-10">
      <h2 className="text-5xl font-bold text-center mb-16 text-transparent bg-gradient-to-b from-amber-200 via-amber-300 to-amber-500 bg-clip-text font-serif">
        基本ルール
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* デッキ構成 */}
        <div className="p-8 bg-gradient-to-br from-white/10 via-white/5 to-transparent rounded-2xl border border-white/20 backdrop-blur-sm shadow-2xl hover:shadow-amber-400/10 transition-all duration-300 group">
          <h3 className="text-2xl font-bold text-amber-300 mb-6 text-center font-serif group-hover:text-amber-200 transition-colors">
            デッキ構成
          </h3>
          <div className="space-y-4 text-gray-200">
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="font-serif">デッキサイズ</span>
              <span className="text-amber-300 font-bold">{GAME_CONSTANTS.DECK_SIZE}枚</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="font-serif">初期ライフ</span>
              <span className="text-amber-300 font-bold">{GAME_CONSTANTS.INITIAL_LIFE}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="font-serif">場の上限</span>
              <span className="text-amber-300 font-bold">{GAME_CONSTANTS.FIELD_LIMIT}体</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="font-serif">エネルギー上限</span>
              <span className="text-amber-300 font-bold">{GAME_CONSTANTS.ENERGY_LIMIT}</span>
            </div>
          </div>
        </div>

        {/* 勝利条件 */}
        <div className="p-8 bg-gradient-to-br from-white/10 via-white/5 to-transparent rounded-2xl border border-white/20 backdrop-blur-sm shadow-2xl hover:shadow-amber-400/10 transition-all duration-300 group">
          <h3 className="text-2xl font-bold text-amber-300 mb-6 text-center font-serif group-hover:text-amber-200 transition-colors">
            勝利条件
          </h3>
          <div className="space-y-4 text-gray-200 text-center">
            <div className="p-4 bg-gradient-to-br from-amber-500/10 to-transparent rounded-xl border border-amber-400/20">
              <p className="font-semibold text-amber-200 mb-2 font-serif">主要勝利</p>
              <p className="text-sm">相手のライフを0にする</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-amber-500/10 to-transparent rounded-xl border border-amber-400/20">
              <p className="font-semibold text-amber-200 mb-2 font-serif">時間切れ勝利</p>
              <p className="text-sm">30ターン経過時にライフが多い方</p>
            </div>
          </div>
        </div>

        {/* ゲームの流れ */}
        <div className="p-8 bg-gradient-to-br from-white/10 via-white/5 to-transparent rounded-2xl border border-white/20 backdrop-blur-sm shadow-2xl hover:shadow-amber-400/10 transition-all duration-300 group">
          <h3 className="text-2xl font-bold text-amber-300 mb-6 text-center font-serif group-hover:text-amber-200 transition-colors">
            ゲームの流れ
          </h3>
          <div className="space-y-4 text-gray-200">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-black text-sm font-bold shadow-lg">1</div>
              <p className="text-sm font-serif">戦術でカード自動配置</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-black text-sm font-bold shadow-lg">2</div>
              <p className="text-sm font-serif">戦闘は自動進行</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-black text-sm font-bold shadow-lg">3</div>
              <p className="text-sm font-serif">結果を観戦して楽しむ</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
