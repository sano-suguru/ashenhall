import { SYSTEM_EFFECT_SOURCES } from '../lib/game-engine/system-effect-sources';
import type { SystemEffectSource } from '../types/game-state';

describe('system effect sources', () => {
  test('constants are assignable to SystemEffectSource', () => {
    const values: SystemEffectSource[] = [
      SYSTEM_EFFECT_SOURCES.DECK_EMPTY,
      SYSTEM_EFFECT_SOURCES.POISON,
      SYSTEM_EFFECT_SOURCES.TURN_SYSTEM,
    ];
    expect(values).toContain(SYSTEM_EFFECT_SOURCES.POISON);
  });
});
