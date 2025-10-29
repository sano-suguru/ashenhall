import { ImageResponse } from 'next/og';
import { decodeDeck } from '@/lib/deck-sharing';
import { getCardById } from '@/data/cards/base-cards';
import { FACTION_DESCRIPTIONS } from '@/types/game';

export const runtime = 'edge';

export const alt = 'Ashenhall Deck';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image({ params }: { params: { code: string } }) {
  const deckData = decodeDeck(params.code);

  if (!deckData) {
    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 48,
            background: 'black',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}
        >
          Invalid Deck Code
        </div>
      ),
      {
        ...size,
      }
    );
  }

  const { faction, cards } = deckData;
  const cardObjects = cards
    .map((id) => getCardById(id))
    .filter((c): c is NonNullable<typeof c> => c != null);
  const factionName = faction.charAt(0).toUpperCase() + faction.slice(1);

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#111827',
          color: 'white',
          fontFamily: '"Inter", sans-serif',
        }}
      >
        <div style={{ fontSize: 60, marginBottom: 40 }}>Ashenhall Deck: {factionName}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', width: '90%', justifyContent: 'center' }}>
          {cardObjects.slice(0, 10).map((card, index) => (
            <div
              key={index}
              style={{
                margin: 10,
                padding: 10,
                border: '1px solid #4B5563',
                borderRadius: 8,
                background: '#1F2937',
                width: 180,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{card.name}</span>
                <span>Cost: {card.cost}</span>
              </div>
              {card.type === 'creature' && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>ATK: {card.attack}</span>
                  <span>HP: {card.health}</span>
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 24, marginTop: 40 }}>{FACTION_DESCRIPTIONS[faction]}</div>
      </div>
    ),
    {
      ...size,
    }
  );
}
