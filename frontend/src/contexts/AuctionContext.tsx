// src/contexts/AuctionContext.tsx
'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

// Define types
interface Bid {
  bid_id: number;
  user_id: number;
  amount: number;
  timestamp: string;
}

interface Auction {
  auction_id: number;
  car_id: number;
  start_time: string;
  end_time: string;
  starting_price: number;
  highest_bid: number | null;
  status: 'active' | 'ended';
  bids?: Bid[];
}

interface AuctionContextType {
  auction: Auction | null;
  placeBid: (amount: number) => void;
  isConnected: boolean;
  error: string | null;
}

// Create context
const AuctionContext = createContext<AuctionContextType | null>(null);

// Context Provider
export function AuctionProvider({ children }: { children: React.ReactNode }) {
  const mountedRef = useRef(false);
  const [auction, setAuction] = useState<Auction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMessage = useCallback((message: any) => {
    if (!mountedRef.current) return;
    console.log('Received WebSocket message:', message);
    console.log('AuctionContext: Received WebSocket message:', message);

    switch (message.type) {
      case 'auctionState':
        console.log('Setting auction state:', message.data);
        setAuction(message.data);
        break;

      case 'newBid':
        console.log('Processing new bid:', message.data);
        setAuction(prev => {
          if (!prev) return null;

          const newBid: Bid = {
            bid_id: message.data.bidId,
            user_id: message.data.userId,
            amount: message.data.amount,
            timestamp: message.data.timestamp
          };

          return {
            ...prev,
            highest_bid: message.data.amount,
            bids: prev.bids ? [newBid, ...prev.bids] : [newBid]
          };
        });
        break;

      case 'error':
        console.log('Received error:', message.message);
        setError(message.message);
        setTimeout(() => setError(null), 5000);
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }, []);

  const { sendMessage, isConnected } = useWebSocket({
    url: 'ws://localhost:3000',
    onMessage: handleMessage,
    onConnect: () => {
      console.log('WebSocket connected, joining auction');
      mountedRef.current = true;
      sendMessage({
        type: 'joinAuction',
        userId: 1,
        auctionId: 6  // Make sure this matches your auction ID
      });
    },
    onDisconnect: () => {
      console.log('WebSocket disconnected');
      mountedRef.current = false;
    }
  });

  const placeBid = useCallback((amount: number) => {
    if (!isConnected || !auction) {
      console.error('Cannot place bid: not connected or no auction');
      return;
    }
     // Add validation for minimum bid amount
  if (amount <= (auction.highest_bid || auction.starting_price)) {
    setError('Bid must be higher than current highest bid');
    return;
  }

  console.log('Placing bid:', {
    type: 'placeBid',
    auctionId: auction.auction_id,
    userId: 1,  // Should come from auth context
    amount: amount
  });

  sendMessage({
    type: 'placeBid',
    auctionId: auction.auction_id,
    userId: 1,  // Should come from auth context
    amount: parseFloat(amount.toFixed(2))  // Ensure proper number formatting
  });
}, [isConnected, auction, sendMessage, setError]);

  return (
    <AuctionContext.Provider value={{ auction, placeBid, isConnected, error }}>
      {children}
    </AuctionContext.Provider>
  );
}

// Custom hook to use the auction context
export function useAuction() {
  const context = useContext(AuctionContext);
  if (!context) {
    throw new Error('useAuction must be used within an AuctionProvider');
  }
  return context;
}

export type { Auction, Bid, AuctionContextType };