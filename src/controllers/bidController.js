// src/controllers/bidController.js
const Bid = require('../models/bid');
const redis = require('../config/redis');

class BidController {
  constructor(auctionController) {
    this.auctionController = auctionController;
    this.userBidTimes = new Map();
  }

  async handleBid(ws, data) {
    try {
      console.log('Processing bid:', data);

      // Validate input data
      if (!data.userId || !data.auctionId || !data.amount) {
        throw new Error('Missing required bid data');
      }

      // Rate limiting check
      const now = Date.now();
      const lastBidTime = this.userBidTimes.get(data.userId) || 0;
      if (now - lastBidTime < 1000) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Please wait before placing another bid'
        }));
        return;
      }
      this.userBidTimes.set(data.userId, now);

      // Place bid
      const bidResult = await Bid.placeBid(
        data.userId,
        data.auctionId,
        bidAmount
      );

      console.log('Bid placed successfully:', bidResult);

      // Broadcast new bid to all participants
      this.auctionController.broadcastToAuction(data.auctionId, {
        type: 'newBid',
        data: {
          bidId: bidResult.data.bidId,
          userId: data.userId,
          amount: bidAmount,
          timestamp: new Date().toISOString()
        }
      });

        // Send confirmation to bidder
    ws.send(JSON.stringify({
      type: 'bidConfirmed',
      data: bidResult.data
    }));

    } catch (error) {
      console.error('Bid error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  }

  async getBidHistory(auctionId) {
    try {
      const history = await Bid.getHistoryForAuction(auctionId);
      return history.map(bid => ({
        bidId: bid.bid_id,
        userId: bid.user_id,
        amount: parseFloat(bid.amount),
        timestamp: bid.timestamp
      }));
    } catch (error) {
      console.error('Error getting bid history:', error);
      throw error;
    }
  }
}

module.exports = BidController;