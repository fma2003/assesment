// src/__tests__/auction.test.tsx
import { render, fireEvent, act } from '@testing-library/react';
import { AuctionProvider, useAuction } from '@/contexts/AuctionContext';
import AuctionPage from '@/app/page';

// Mock WebSocket
class MockWebSocket {
  onopen: () => void = () => {};
  onmessage: (event: any) => void = () => {};
  onclose: () => void = () => {};
  onerror: () => void = () => {};
  send: jest.Mock = jest.fn();
  close: jest.Mock = jest.fn();

  constructor() {
    setTimeout(() => this.onopen(), 0);
  }
}

global.WebSocket = MockWebSocket as any;

describe('Auction System', () => {
  it('connects to WebSocket and joins auction', () => {
    const { getByText } = render(
      <AuctionProvider>
        <AuctionPage />
      </AuctionProvider>
    );

    expect(getByText('Connecting to auction server...')).toBeInTheDocument();
  });

  it('displays current bid and allows placing bids', async () => {
    const { getByText, getByPlaceholderText } = render(
      <AuctionProvider>
        <AuctionPage />
      </AuctionProvider>
    );

    // Simulate auction state message
    act(() => {
      const ws = new MockWebSocket();
      ws.onmessage({
        data: JSON.stringify({
          type: 'auctionState',
          data: {
            auction_id: 1,
            current_bid: 1000,
            end_time: new Date(Date.now() + 60000).toISOString(),
            status: 'active'
          }
        })
      });
    });

    const input = getByPlaceholderText('Enter bid amount');
    fireEvent.change(input, { target: { value: '2000' } });
    fireEvent.click(getByText('Place Bid'));

    // Verify bid was sent
    expect(MockWebSocket.prototype.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'placeBid',
        auctionId: 1,
        amount: 2000
      })
    );
  });

  it('handles auction end correctly', async () => {
    const { getByText } = render(
      <AuctionProvider>
        <AuctionPage />
      </AuctionProvider>
    );

    // Simulate auction end message
    act(() => {
      const ws = new MockWebSocket();
      ws.onmessage({
        data: JSON.stringify({
          type: 'auctionEnd',
          data: {
            auctionId: 1,
            userId: 1,
            amount: 2000
          }
        })
      });
    });

    expect(getByText('Auction Ended')).toBeInTheDocument();
  });
});