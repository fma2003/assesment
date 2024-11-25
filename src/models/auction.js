// src/models/auction.js
const pool = require('../config/database');
const redis = require('../config/redis');

class Auction {
  static async updateStatus(auctionId, status) {
    try {
        const [result] = await pool.query(
            'UPDATE auctions SET status = ? WHERE auction_id = ?',
            [status, auctionId]
        );
        return result.affectedRows > 0;
    } catch (error) {
        console.error('Error updating auction status:', error);
        throw error;
    }
}
  static async getAuction(auctionId) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM auctions WHERE auction_id = ?',
        [auctionId]
      );
      return rows[0];
    } catch (error) {
      console.error('Error getting auction:', error);
      throw error;
    }
  }

  static async getCurrentHighestBid(auctionId) {
    try {
      const cacheKey = `auction:${auctionId}:highestBid`;
      const cachedBid = await redis.get(cacheKey);
      
      if (cachedBid) {
        return JSON.parse(cachedBid);
      }

      const [rows] = await pool.query(
        'SELECT MAX(bid_amount) as highest_bid FROM bids WHERE auction_id = ?',
        [auctionId]
      );

      const highestBid = rows[0].highest_bid || 0;
      await redis.set(cacheKey, JSON.stringify({ amount: highestBid }));
      
      return { amount: highestBid };
    } catch (error) {
      console.error('Error getting highest bid:', error);
      throw error;
    }
  }

  static async getWinner(auctionId) {
    try {
        const [rows] = await pool.query(
            `SELECT b.*, u.username 
            FROM bids b 
            JOIN users u ON b.user_id = u.user_id 
            WHERE b.auction_id = ? 
            ORDER BY b.bid_amount DESC 
            LIMIT 1`,
            [auctionId]
        );
        return rows[0];
    } catch (error) {
        console.error('Error getting winner:', error);
        throw error;
    }
}
}

module.exports = Auction;