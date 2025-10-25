import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameBoard from '@/components/GameBoard';
import { createInitialGameState } from '@/lib/game-engine/game-state';
import { sampleDecks } from '@/data/decks/sample-decks';
import { getCardById } from '@/data/cards/base-cards';
import type { Card } from '@/types/game';

// Mocks（統合後の依存関係に対応）
jest.mock('@/components/BattleLogModal', () => {
  const MockComponent = () => <div data-testid="battle-log-modal" />;
  MockComponent.displayName = 'MockBattleLogModal';
  return MockComponent;
});

jest.mock('@/components/BattlePlaybackControls', () => {
  const MockComponent = () => <div data-testid="battle-playback-controls" />;
  MockComponent.displayName = 'MockBattlePlaybackControls';
  return MockComponent;
});


describe('GameBoard Component', () => {
  const necromancerDeckData = sampleDecks.find(d => d.faction === 'necromancer')!;
  const berserkerDeckData = sampleDecks.find(d => d.faction === 'berserker')!;

  const player1Deck: Card[] = necromancerDeckData.cardIds.map(id => getCardById(id)).filter(Boolean) as Card[];
  const player2Deck: Card[] = berserkerDeckData.cardIds.map(id => getCardById(id)).filter(Boolean) as Card[];

  const mockGameState = createInitialGameState(
    'test-game-id',
    player1Deck,
    player2Deck,
    'necromancer',
    'berserker',
    'test-seed'
  );

  const mockProps = {
    gameState: mockGameState,
    onReturnToSetup: jest.fn(),
    isPlaying: false,
    setIsPlaying: jest.fn(),
    currentTurn: -1,
    setCurrentTurn: jest.fn(),
    gameSpeed: 1,
    setGameSpeed: jest.fn(),
  };

  it('renders GameBoard with basic structure', () => {
    render(<GameBoard {...mockProps} />);

    // 統合後は実際のDOM要素の存在をチェック
    expect(screen.getByText('ASHENHALL')).toBeInTheDocument();
    // 「あなた」は複数箇所に表示される可能性があるため、getAllByTextを使用
    const playerLabels = screen.getAllByText('あなた');
    expect(playerLabels.length).toBeGreaterThan(0);
    expect(screen.getByText('AI対戦相手')).toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() => render(<GameBoard {...mockProps} />)).not.toThrow();
  });
});
