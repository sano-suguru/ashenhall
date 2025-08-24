'use client';

import type { CustomDeck, Card } from '@/types/game';
import { GAME_CONSTANTS } from '@/types/game';
import { getCardsByFaction, getCardById } from '@/data/cards/base-cards';
import CardComponent from './CardComponent';
import { Star } from 'lucide-react';

interface DeckImageGeneratorProps {
  deck: CustomDeck;
}

export default function DeckImageGenerator({ deck }: DeckImageGeneratorProps) {
  const availableCards = getCardsByFaction(deck.faction);
  const sortedCards = deck.cards
    .map(id => getCardById(id))
    .filter((c): c is Card => c !== undefined)
    .sort((a, b) => a.cost - b.cost);

  return (
    <div style={{ width: 800, padding: '16px', backgroundColor: '#111827', color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#FBBF24' }}>
          デッキ内容 ({deck.cards.length}/{GAME_CONSTANTS.DECK_SIZE})
        </h3>
        <div style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>
          コアカード: {deck.coreCardIds.length}/3
        </div>
      </div>
      <div style={{ backgroundColor: 'rgba(31, 41, 55, 0.5)', borderRadius: '0.5rem', padding: '8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {sortedCards.map((card, index) => {
            const isCore = deck.coreCardIds.includes(card.id);
            return (
              <div key={`${card.id}-${index}`} style={{ position: 'relative' }}>
                <CardComponent card={card} size="medium" />
                {isCore && <Star size={16} style={{ position: 'absolute', top: '8px', left: '8px', color: '#FBBF24' }} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
