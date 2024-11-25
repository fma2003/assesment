// src/controllers/auctionController.js
const Auction = require('../models/auction');
const redis = require('../config/redis');

class AuctionController {
    constructor(wss) {
        this.wss = wss;
        this.auctions = new Map();
        this.auctionTimers = new Map();
    }

    async handleJoinAuction(ws, userId, auctionId) {
        try {
            console.log(`User ${userId} attempting to join auction ${auctionId}`);
            
            const auction = await Auction.getAuction(auctionId);
            if (!auction) {
                throw new Error('Auction not found');
            }

            // Check if auction has already ended
            const endTime = new Date(auction.end_time).getTime();
            const now = new Date().getTime();

            // Add client to auction room
            if (!this.auctions.has(auctionId)) {
                this.auctions.set(auctionId, new Set());
                
                // Set up auction end timer
                const timeUntilEnd = endTime - now;
                console.log(`Setting timer for auction ${auctionId}: ${timeUntilEnd}ms remaining`);

                if (timeUntilEnd > 0) {
                    this.auctionTimers.set(auctionId, setTimeout(async () => {
                        console.log(`Timer triggered for auction ${auctionId}`);
                        await this.handleAuctionEnd(auctionId);
                    }, timeUntilEnd));
                }
            }

            this.auctions.get(auctionId).add(ws);
            ws.auctionId = auctionId;
            ws.userId = userId;

            // Send current auction state
            const currentBid = await Auction.getCurrentHighestBid(auctionId);
            ws.send(JSON.stringify({
                type: 'auctionState',
                data: {
                    ...auction,
                    currentBid
                }
            }));

            console.log(`User ${userId} successfully joined auction ${auctionId}`);
        } catch (error) {
            console.error('Join auction error:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: error.message
            }));
        }
    }

    async handleAuctionEnd(auctionId) {
        try {
            console.log(`Handling end of auction ${auctionId}`);
            
            // Update auction status
            await Auction.updateStatus(auctionId, 'ended');
            
            // Get winning bid
            const winner = await Auction.getWinner(auctionId);
            
            // Prepare end message
            const endMessage = {
                type: 'auctionEnd',
                data: {
                    auctionId: auctionId,
                    userId: winner ? winner.user_id : null,
                    amount: winner ? winner.bid_amount : 0,
                    endTime: new Date().toISOString()
                }
            };

            // Send end notification to all connected clients
            const clients = this.auctions.get(auctionId);
            if (clients) {
                console.log(`Broadcasting end message to ${clients.size} clients`);
                clients.forEach(client => {
                    if (client.readyState === 1) { // WebSocket.OPEN
                        client.send(JSON.stringify(endMessage));
                    }
                });
            }

            // Cleanup
            if (this.auctionTimers.has(auctionId)) {
                clearTimeout(this.auctionTimers.get(auctionId));
                this.auctionTimers.delete(auctionId);
            }
            this.auctions.delete(auctionId);
            
            console.log(`Auction ${auctionId} ended successfully`);
        } catch (error) {
            console.error('Error ending auction:', error);
        }
    }

    removeClient(ws) {
        if (ws.auctionId && this.auctions.has(ws.auctionId)) {
            console.log(`Removing client from auction ${ws.auctionId}`);
            this.auctions.get(ws.auctionId).delete(ws);
            
            // If no more clients, cleanup auction
            if (this.auctions.get(ws.auctionId).size === 0) {
                if (this.auctionTimers.has(ws.auctionId)) {
                    clearTimeout(this.auctionTimers.get(ws.auctionId));
                    this.auctionTimers.delete(ws.auctionId);
                }
                this.auctions.delete(ws.auctionId);
                console.log(`Auction ${ws.auctionId} cleaned up - no more clients`);
            }
        }
    }

    broadcastToAuction(auctionId, message) {
        const clients = this.auctions.get(auctionId);
        if (clients) {
            clients.forEach(client => {
                if (client.readyState === 1) { // WebSocket.OPEN
                    client.send(JSON.stringify(message));
                }
            });
        }
    }
}

module.exports = AuctionController;