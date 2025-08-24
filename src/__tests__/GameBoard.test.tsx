import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameBoard from '@/components/GameBoard';
import { createInitialGameState } from '@/lib/game-engine/game-state';
import { sampleDecks } from '@/data/decks/sample-decks';
import { getCardById } from '@/data/cards/base-cards';
import type { Card, PlayerState } from '@/types/game';

// Mocks
jest.mock('@/components/game-board/GameHeader', () => {
  const MockComponent = () => <div data-testid="game-header" />;
  MockComponent.displayName = 'MockGameHeader';
  return MockComponent;
});

jest.mock('@/components/game-board/PlayerArea', () => {
  const MockComponent = ({ player, isOpponent }: { player: PlayerState, isOpponent: boolean }) => (
    <div data-testid={isOpponent ? 'opponent-area' : 'player-area'}>
      {player.id}
    </div>
  );
  MockComponent.displayName = 'MockPlayerArea';
  return MockComponent;
});

jest.mock('@/components/game-board/RecentLog', () => {
  const MockComponent = () => <div data-testid="recent-log" />;
  MockComponent.displayName = 'MockRecentLog';
  return MockComponent;
});

jest.mock('@/components/game-board/GameSidebar', () => {
  const MockComponent = () => <div data-testid="game-sidebar" />;
  MockComponent.displayName = 'MockGameSidebar';
  return MockComponent;
});

jest.mock('@/components/BattleLogModal', () => {
  const MockComponent = () => <div data-testid="battle-log-modal" />;
  MockComponent.displayName = 'MockBattleLogModal';
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
    'balanced',
    'aggressive',
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

  it('renders all main subcomponents', () => {
    render(<GameBoard {...mockProps} />);

    expect(screen.getByTestId('game-header')).toBeInTheDocument();
    expect(screen.getByTestId('player-area')).toBeInTheDocument();
    expect(screen.getByTestId('opponent-area')).toBeInTheDocument();
    expect(screen.getByTestId('game-sidebar')).toBeInTheDocument();
  });

  it('does not render RecentLog when showLog is false', () => {
    render(<GameBoard {...mockProps} />);
    expect(screen.queryByTestId('recent-log')).not.toBeInTheDocument();
  });
});
