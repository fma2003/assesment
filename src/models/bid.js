// src/models/bid.js
const pool = require('../config/database');
const redis = require('../config/redis');

class Bid {
  static async #getConnection() {
    return await pool.getConnection();
  }

  static async placeBid(userId, auctionId, amount) {
    const connection = await this.#getConnection();
    try {
      await connection.beginTransaction();

      // Check if auction exists and is active
      const [auctions] = await connection.query(
        'SELECT * FROM auctions WHERE auction_id = ? AND status = "active" FOR UPDATE',
        [auctionId]
      );

      if (auctions.length === 0) {
        throw new Error('Auction not found or not active');
      }

      // Check if bid is higher than current highest bid
      const [bids] = await connection.query(
        'SELECT MAX(bid_amount) as highest_bid FROM bids WHERE auction_id = ?',
        [auctionId]
      );

      const currentHighestBid = bids[0].highest_bid || auctions[0].starting_price;
      if (parseFloat(amount) <= parseFloat(currentHighestBid)) {
        throw new Error(`Bid must be higher than current highest bid of ${currentHighestBid}`);
      }

      // Place bid
      const [result] = await connection.query(
        'INSERT INTO bids (user_id, auction_id, bid_amount) VALUES (?, ?, ?)',
        [userId, auctionId, amount]
      );

      // Update auction highest bid
      await connection.query(
        'UPDATE auctions SET highest_bid = ? WHERE auction_id = ? AND (highest_bid IS NULL OR highest_bid < ?)',
        [amount, auctionId, amount]
      );

      await connection.commit();

      // Update Redis cache
      const cacheKey = `auction:${auctionId}:highestBid`;
      await redis.set(cacheKey, JSON.stringify({ amount, userId }));

      return {
        success: true,
        type: 'newBid',
        data: {
          bidId: result.insertId,
          userId: userId,
          amount: parseFloat(amount),
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getHistoryForAuction(auctionId) {
    const connection = await this.#getConnection();
    try {
      const [rows] = await connection.query(
        `SELECT b.*, u.username 
         FROM bids b 
         JOIN users u ON b.user_id = u.user_id 
         WHERE b.auction_id = ? 
         ORDER BY b.bid_amount DESC`,
        [auctionId]
      );
      return rows;
    } catch (error) {
      console.error('Error getting bid history:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = Bid;