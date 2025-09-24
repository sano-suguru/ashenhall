export const SYSTEM_EFFECT_SOURCES = {
  DECK_EMPTY: 'deck_empty',
  POISON: 'poison_effect',
  TURN_SYSTEM: 'turn_system',
} as const;

export type SystemEffectSourceConst = typeof SYSTEM_EFFECT_SOURCES[keyof typeof SYSTEM_EFFECT_SOURCES];

// 型整合性チェック (types/game-state.ts の SystemEffectSource と一致させる目的)
// 変更時に型エラーで気付けるようにする (no-op 代入)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _typeCheck: SystemEffectSourceConst extends import('../../types/game-state').SystemEffectSource ? true : never = true;