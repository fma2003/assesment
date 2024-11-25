// test-websocket.js
const WebSocket = require('ws');

console.log('Starting WebSocket test client...');

const ws = new WebSocket('ws://localhost:3000');

let currentAuctionState = null;

ws.on('open', () => {
  console.log('Connected to WebSocket server');

  // Join auction
  console.log('Sending joinAuction message...');
  ws.send(JSON.stringify({
    type: 'joinAuction',
    userId: 1,
    auctionId: 1
  }));
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    console.log('\nReceived message:', message);

    if (message.type === 'auctionState') {
      currentAuctionState = message.data;
      
      // Calculate new bid amount
      const currentHighestBid = parseFloat(currentAuctionState.highest_bid || currentAuctionState.starting_price);
      const newBidAmount = currentHighestBid + 1000; // Increment by 1000

      console.log(`\nCurrent auction state:`);
      console.log(`- Starting price: ${currentAuctionState.starting_price}`);
      console.log(`- Current highest bid: ${currentHighestBid}`);
      console.log(`- Preparing to place new bid: ${newBidAmount}`);

      // Place new bid after a delay
      setTimeout(() => {
        console.log(`\nSending bid of ${newBidAmount}...`);
        ws.send(JSON.stringify({
          type: 'placeBid',
          auctionId: 1,
          amount: newBidAmount
        }));
      }, 2000);
    }

    if (message.type === 'bidConfirmed') {
      console.log('\nBid confirmed!');
      console.log(`- Bid ID: ${message.data.bidId}`);
      console.log(`- Amount: ${message.data.amount}`);
    }

    if (message.type === 'newBid') {
      console.log('\nNew bid received:');
      console.log(`- User ID: ${message.data.userId}`);
      console.log(`- Amount: ${message.data.amount}`);
      console.log(`- Time: ${message.data.timestamp}`);
    }

    if (message.type === 'error') {
      console.error('\nError from server:', message.message);
    }
  } catch (error) {
    console.error('Error parsing message:', error);
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', (code, reason) => {
  console.log(`\nDisconnected from WebSocket server. Code: ${code}, Reason: ${reason}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Closing WebSocket connection...');
  ws.close();
  process.exit(0);
});