// test-auction-end.js
const WebSocket = require('ws');

console.log('Starting Auction End Test...');

const ws = new WebSocket('ws://localhost:3000');

// Update to use auction_id 4
const testAuction = {
    auctionId: 5,  // Changed to the new auction
    userId: 1
};

ws.on('open', () => {
    console.log('Connected to WebSocket server');

    // Join the auction that's about to end
    console.log('Joining auction that will end soon...');
    ws.send(JSON.stringify({
        type: 'joinAuction',
        userId: testAuction.userId,
        auctionId: testAuction.auctionId
    }));
});

ws.on('message', (data) => {
    try {
        const message = JSON.parse(data);
        console.log('\nReceived message:', message);

        if (message.type === 'auctionState') {
            const endTime = new Date(message.data.end_time);
            const now = new Date();
            const timeUntilEnd = (endTime - now) / 1000;
            console.log(`\nAuction will end in ${timeUntilEnd.toFixed(0)} seconds`);
            
            // If auction hasn't ended yet
            if (timeUntilEnd > 0) {
                console.log('Waiting for auction to end...');
            } else {
                console.log('Auction has already ended!');
            }
        }

        if (message.type === 'auctionEnd') {
            console.log('\n=== AUCTION ENDED ===');
            console.log(`Final Bid Amount: ${message.data.amount}`);
            console.log(`Winning User ID: ${message.data.userId}`);
            console.log(`End Time: ${message.data.endTime}`);
            console.log('===================\n');
        }
    } catch (error) {
        console.error('Error parsing message:', error);
    }
});

ws.on('error', (error) => {
    console.error('WebSocket error:', error);
});

ws.on('close', () => {
    console.log('Connection closed');
});

// Keep the process running for 40 seconds
const timeout = setTimeout(() => {
    console.log('\nTest timeout reached. Closing connection...');
    ws.close();
    process.exit(0);
}, 40000);

// Handle manual termination
process.on('SIGINT', () => {
    clearTimeout(timeout);
    console.log('Closing connection...');
    ws.close();
    process.exit(0);
});