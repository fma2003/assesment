// src/types/websocket.ts
export interface WebSocketBaseMessage {
    type: string;
    [key: string]: any;
  }
  
  export interface JoinAuctionMessage extends WebSocketBaseMessage {
    type: 'joinAuction';
    userId: number;
    auctionId: number;
  }
  
  export interface PlaceBidMessage extends WebSocketBaseMessage {
    type: 'placeBid';
    auctionId: number;
    amount: number;
  }
  
  export type WebSocketMessage = JoinAuctionMessage | PlaceBidMessage;
  
  export interface WebSocketResponse {
    type: 'auctionState' | 'newBid' | 'auctionEnd' | 'error';
    data?: any;
    message?: string;
  }