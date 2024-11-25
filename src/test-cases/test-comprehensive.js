// test-comprehensive.js
const WebSocket = require('ws');
const mysql = require('mysql2/promise');
const Redis = require('ioredis');
require('dotenv').config();

console.log('Starting Comprehensive Test Suite...');

// Test Configuration
const TEST_CONFIG = {
    normalAuctionId: 7,
    ddosAuctionId: 8,
    rateAuctionId: 9,
    testUserId: 1
};

// Custom assert function
function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
    return true;
}

// Test Results Tracker
const TestResults = {
    passed: 0,
    failed: 0,
    addPass(testName) {
        this.passed++;
        console.log(`✓ PASSED: ${testName}`);
    },
    addFail(testName, error) {
        this.failed++;
        console.log(`✗ FAILED: ${testName}`);
        console.error(`  Error: ${error.message}`);
    },
    summary() {
        console.log('\n=== Test Summary ===');
        console.log(`Total Tests: ${this.passed + this.failed}`);
        console.log(`Passed: ${this.passed}`);
        console.log(`Failed: ${this.failed}`);
    }
};

// Database connection function
async function connectDB() {
    return await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'car_auction'
    });
}

// Redis connection
const redis = new Redis({
    host: '127.0.0.1',
    port: 6379,
    password: 'mysecurepassword'
});

// Helper function to create WebSocket
const createWebSocket = (userId) => {
    const ws = new WebSocket('ws://localhost:3000');
    ws.userId = userId;
    return ws;
};
async function cleanupTestData(connection) {
    try {
        console.log('Cleaning up existing test data...');
        
        // Delete existing test auctions and related bids
        await connection.query('DELETE FROM bids WHERE auction_id IN (?, ?, ?)', 
            [TEST_CONFIG.normalAuctionId, TEST_CONFIG.ddosAuctionId, TEST_CONFIG.rateAuctionId]);
            
        await connection.query('DELETE FROM auctions WHERE auction_id IN (?, ?, ?)', 
            [TEST_CONFIG.normalAuctionId, TEST_CONFIG.ddosAuctionId, TEST_CONFIG.rateAuctionId]);
            
        console.log('✓ Existing test data cleaned');
    } catch (error) {
        console.error('Error cleaning test data:', error);
        throw error;
    }
}
// Setup test data
async function setupTestData(connection) {
    try {
        console.log('Setting up test data...');
        
        // Clean up existing data first
        await cleanupTestData(connection);
        
        // Create test auctions
        await connection.query(`
            INSERT INTO auctions (auction_id, car_id, start_time, end_time, starting_price, status)
            VALUES 
            (?, 1, NOW(), DATE_ADD(NOW(), INTERVAL 45 SECOND), 10000.00, 'active'),
            (?, 1, NOW(), DATE_ADD(NOW(), INTERVAL 45 SECOND), 10000.00, 'active'),
            (?, 1, NOW(), DATE_ADD(NOW(), INTERVAL 45 SECOND), 10000.00, 'active')
        `, [TEST_CONFIG.normalAuctionId, TEST_CONFIG.ddosAuctionId, TEST_CONFIG.rateAuctionId]);

        console.log('✓ Test data setup complete');
    } catch (error) {
        console.error('Error setting up test data:', error);
        throw error;
    }
}

// Wait for WebSocket connection
async function waitForConnection(ws) {
    return new Promise((resolve) => {
        ws.on('open', () => {
            console.log('✓ WebSocket connection established');
            resolve(true);
        });
    });
}

// Test auction join
async function testAuctionJoin(ws) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Auction join timeout'));
        }, 5000);

        ws.send(JSON.stringify({
            type: 'joinAuction',
            userId: TEST_CONFIG.testUserId,
            auctionId: TEST_CONFIG.normalAuctionId
        }));

        ws.once('message', (data) => {
            clearTimeout(timeout);
            try {
                const message = JSON.parse(data);
                console.log('✓ Auction join response received:', message.type);
                resolve(message.type === 'auctionState');
            } catch (error) {
                reject(error);
            }
        });
    });
}


// Test bidding
async function testBidding(ws) {
    return new Promise((resolve) => {
        let bidsReceived = 0;
        const expectedBids = 2;

        const handleMessage = (data) => {
            const message = JSON.parse(data);
            if (message.type === 'newBid') {
                bidsReceived++;
                console.log(`✓ Bid ${bidsReceived} confirmed:`, message.data.amount);

                if (bidsReceived === expectedBids) {
                    ws.removeListener('message', handleMessage);
                    resolve(true);
                }
            }
        };

        ws.on('message', handleMessage);

        // Place test bids
        setTimeout(() => {
            ws.send(JSON.stringify({
                type: 'placeBid',
                auctionId: TEST_CONFIG.normalAuctionId,
                amount: 11000
            }));
        }, 1000);

        setTimeout(() => {
            ws.send(JSON.stringify({
                type: 'placeBid',
                auctionId: TEST_CONFIG.normalAuctionId,
                amount: 12000
            }));
        }, 2000);
    });
}

// Test rate limiting
async function testRateLimiting(ws) {
    return new Promise((resolve) => {
        let errorReceived = false;
        
        const handleMessage = (data) => {
            const message = JSON.parse(data);
            if (message.type === 'error' && message.message.includes('wait')) {
                errorReceived = true;
                console.log('✓ Rate limiting working:', message.message);
                ws.removeListener('message', handleMessage);
                resolve(true);
            }
        };

        ws.on('message', handleMessage);

        // Send rapid bids
        for (let i = 0; i < 3; i++) {
            ws.send(JSON.stringify({
                type: 'placeBid',
                auctionId: TEST_CONFIG.rateAuctionId,
                amount: 11000 + (i * 1000)
            }));
        }

        // Resolve after timeout if no error received
        setTimeout(() => {
            if (!errorReceived) {
                resolve(false);
            }
        }, 3000);
    });
}

// Test DDoS protection
async function testDDoSProtection() {
    const connections = [];
    let connectionErrorReceived = false;

    return new Promise((resolve) => {
        // Try to create more connections than allowed
        for (let i = 0; i < 7; i++) {
            const ws = createWebSocket(TEST_CONFIG.testUserId);
            
            ws.on('close', (code, reason) => {
                if (code === 1008) {
                    connectionErrorReceived = true;
                    console.log('✓ DDoS protection working: connection limited');
                    resolve(true);
                }
            });

            connections.push(ws);
        }

        // Cleanup after test
        setTimeout(() => {
            connections.forEach(conn => conn.close());
            resolve(connectionErrorReceived);
        }, 2000);
    });
}

// Test auction end
async function testAuctionEnd(ws) {
    return new Promise((resolve) => {
        ws.on('message', (data) => {
            const message = JSON.parse(data);
            if (message.type === 'auctionEnd') {
                console.log('✓ Auction end notification received:', message.data);
                resolve(true);
            }
        });
    });
}

// Verify final state
async function verifyFinalState(connection) {
    const [bids] = await connection.query(
        'SELECT * FROM bids WHERE auction_id = ? ORDER BY bid_amount DESC',
        [TEST_CONFIG.normalAuctionId]
    );
    console.log(`✓ Found ${bids.length} bids in database`);
    return bids.length > 0;
}

// Cleanup
async function cleanup(connection, ws) {
    console.log('\nCleaning up...');
    try {
        // Clean test data
        await cleanupTestData(connection);
        
        // Close connections
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
        }
        await connection.end();
        redis.disconnect();
        
        console.log('✓ Cleanup complete');
    } catch (error) {
        console.error('Error during cleanup:', error);
    }
}


// Main test function
async function runTests() {
    console.log('\n=== Starting Comprehensive Tests ===\n');
    let connection;
    let ws;

    try {
        // Setup
        connection = await connectDB();
        await setupTestData(connection);

        // 1. WebSocket Connection Test
        console.log('\n1. Testing WebSocket connection...');
        ws = createWebSocket(TEST_CONFIG.testUserId);
        const connected = await waitForConnection(ws);
        assert(connected, 'WebSocket connection failed');
        TestResults.addPass('WebSocket Connection');

        // 2. Auction Join Test
        console.log('\n2. Testing auction join...');
        const joinResult = await testAuctionJoin(ws);
        assert(joinResult, 'Auction join failed');
        TestResults.addPass('Auction Join');

        // 3. Bidding Test
        console.log('\n3. Testing bidding functionality...');
        const biddingResult = await testBidding(ws);
        assert(biddingResult, 'Bidding test failed');
        TestResults.addPass('Bidding Functionality');

        // 4. Rate Limiting Test
        console.log('\n4. Testing rate limiting...');
        const rateLimitResult = await testRateLimiting(ws);
        assert(rateLimitResult, 'Rate limiting test failed');
        TestResults.addPass('Rate Limiting');

        // 5. DDoS Protection Test
        console.log('\n5. Testing DDoS protection...');
        const ddosResult = await testDDoSProtection();
        assert(ddosResult, 'DDoS protection test failed');
        TestResults.addPass('DDoS Protection');

        // 6. Auction End Test
        console.log('\n6. Testing auction end...');
        const auctionEndResult = await testAuctionEnd(ws);
        assert(auctionEndResult, 'Auction end test failed');
        TestResults.addPass('Auction End');

        // 7. Final State Verification
        console.log('\n7. Verifying final state...');
        const finalState = await verifyFinalState(connection);
        assert(finalState, 'Final state verification failed');
        TestResults.addPass('Final State Verification');

    } catch (error) {
        console.error('Test failed:', error);
        TestResults.addFail(error.message);
    } finally {
        // Cleanup and show results
        await cleanup(connection, ws);
        TestResults.summary();
        
        // Exit with appropriate code
        process.exit(TestResults.failed > 0 ? 1 : 0);
    }
}

// Run the tests
runTests().catch(error => {
    console.error('Critical test failure:', error);
    process.exit(1);
});