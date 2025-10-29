import { createInitialGameState, processGameStep } from '@/lib/game-engine/core';
import type { GameState, GameAction } from '@/types/game';

function collectActions(from: GameState, to: GameState): GameAction[] {
  return to.actionLog.slice(from.actionLog.length);
}

describe('Phase action emission ordering', () => {
  test('draw phase emits card_draw before phase_change (fatigue case)', () => {
    const state = createInitialGameState('g1', [], [], 'mage', 'mage', 'seed');
    expect(state.phase).toBe('draw');
    const next = processGameStep(state);
    const diff = collectActions(state, next).map((a) => a.type);
    const drawIdx = diff.indexOf('card_draw');
    const phaseIdx = diff.indexOf('phase_change');
    expect(drawIdx).toBeGreaterThanOrEqual(0);
    expect(phaseIdx).toBeGreaterThan(drawIdx);
  });

  test('energy phase emits energy_update (optional) then energy_refill then phase_change', () => {
    let s = createInitialGameState('g2', [], [], 'mage', 'mage', 'seed');
    // 1 step draw -> energy
    s = processGameStep(s);
    expect(s.phase).toBe('energy');
    const after = processGameStep(s);
    const diff = collectActions(s, after).map((a) => a.type);
    // energy_update は最大増加がないと出ない可能性があるが 1ターン目は出る想定
    const refillIndex = diff.indexOf('energy_refill');
    expect(refillIndex).toBeGreaterThanOrEqual(0);
    const phaseChangeIndex = diff.indexOf('phase_change');
    expect(phaseChangeIndex).toBeGreaterThan(refillIndex);
  });

  test('end phase emits staged end_stage actions', () => {
    let s = createInitialGameState('g3', [], [], 'mage', 'mage', 'seed');
    // フェーズが end になるまで進める（安全上限）
    let guard = 50;
    while (s.phase !== 'end' && guard-- > 0) {
      s = processGameStep(s);
    }
    expect(s.phase).toBe('end');
    const after = processGameStep(s);
    const newActs = collectActions(s, after).filter((a) => a.type === 'end_stage');
    const stages = newActs.map((a) => (a.type === 'end_stage' ? a.data.stage : ''));
    // 期待ステージの順序チェック（必須セットの包含）
    const statusIdx = stages.indexOf('status_tick');
    const cleanupIdx = stages.indexOf('cleanup');
    const turnEndIdx = stages.indexOf('turn_end_trigger');
    expect(statusIdx).toBeGreaterThanOrEqual(0);
    expect(cleanupIdx).toBeGreaterThan(statusIdx);
    expect(turnEndIdx).toBeGreaterThan(cleanupIdx);
  });
});
