// src/types/auction.ts
export interface Bid {
    bid_id: number;
    user_id: number;
    amount: number;  // This matches your database bid_amount
    timestamp: string;
  }
  
  export interface Auction {
    auction_id: number;
    car_id: number;
    start_time: string;
    end_time: string;
    starting_price: number;
    highest_bid: number | null;
    status: 'active' | 'ended';
    bids?: Bid[];
  }
  
  export interface AuctionState {
    auction: Auction | null;
    placeBid: (amount: number) => void;
    isConnected: boolean;
    error: string | null;
  }