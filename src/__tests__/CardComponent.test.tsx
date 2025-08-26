import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CardComponent from '../components/CardComponent';
import * as CardTextUtils from '../lib/card-text-utils';
import { necromancerCards } from '../data/cards/base-cards';

// getEffectText関数をモック化
jest.mock('../lib/card-text-utils');
const mockedGetEffectText = jest.spyOn(CardTextUtils, 'getEffectText');

// next/font/googleのモック
jest.mock('next/font/google', () => ({
  Inter: () => ({
    className: 'mocked-inter-font',
  }),
  Lusitana: () => ({
    className: 'mocked-lusitana-font',
  }),
}));

// createPortalのモック
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

describe('CardComponent', () => {
  beforeEach(() => {
    // 各テストの前にモックをクリア
    mockedGetEffectText.mockClear();
  });

  it('カード効果を持つ場合、ツールチップ内でgetEffectTextを呼び出してその結果を表示すること', async () => {
    const testCard = necromancerCards.find(c => c.id === 'necro_harvester'); // 魂の収穫者
    if (!testCard) {
      throw new Error('Test card not found');
    }
    
    mockedGetEffectText.mockReturnValue('モックされた効果テキスト');

    render(<CardComponent card={testCard} />);

    // CardComponentにマウスオーバーしてツールチップを表示させる
    const cardElement = screen.getByText(testCard.name).closest('div');
    if (cardElement) {
      fireEvent.mouseEnter(cardElement);
    }

    // モック関数がカードの効果オブジェクトと共に呼び出されたか検証
    expect(mockedGetEffectText).toHaveBeenCalledWith(testCard.effects[0], testCard.type, testCard.id);
    
    // モックの返り値が画面に表示されているか検証
    const effectText = await screen.findByText('モックされた効果テキスト');
    expect(effectText).toBeInTheDocument();
  });

  it('カード効果を持たない場合、getEffectTextを呼び出さないこと', () => {
    const testCard = necromancerCards.find(c => c.id === 'necro_skeleton'); // 骸骨剣士 (効果なし)
    if (!testCard) {
      throw new Error('Test card not found');
    }

    render(<CardComponent card={testCard} />);

    const cardElement = screen.getByText(testCard.name).closest('div');
    if (cardElement) {
      fireEvent.mouseEnter(cardElement);
    }

    // モック関数が呼び出されていないことを検証
    expect(mockedGetEffectText).not.toHaveBeenCalled();
  });
});
