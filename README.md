Car Bidding System
A real-time car auction system implementing WebSocket communication, concurrent bid handling, and DDoS protection.
Prerequisites

Node.js (v14 or higher)
MySQL (v5.7 or higher)
Redis (v6 or higher)

Installation

Clone the repository:

bashCopygit clone [repository-url]
cd car-bidding-system

Install dependencies:

bashCopy# Backend dependencies
npm install

# Frontend dependencies
cd frontend
npm install

Configure MySQL:

bashCopymysql -u root -p
Run these SQL commands:
sqlCopyCREATE DATABASE car_auction;
USE car_auction;

# Create tables (copy from schema.sql)
source schema.sql;

Set up environment variables:

bashCopy# In backend directory
cp .env.example .env
# Edit .env with your database credentials
Database Setup
Clean and Create New Auction

Clean existing data:

sqlCopy-- Connect to MySQL
mysql -u your_username -p
USE car_auction;

-- Delete existing bids and auctions
DELETE FROM bids;
DELETE FROM auctions;

-- Create new auction with ID 6
INSERT INTO auctions (
    auction_id,
    car_id,
    start_time,
    end_time,
    starting_price,
    status
) VALUES (
    6,
    1,
    NOW(),
    DATE_ADD(NOW(), INTERVAL 30 MINUTE),
    10000.00,
    'active'
);
Running the Application

Start the backend server:

bashCopy# In root directory
node src/server.js

Start the frontend development server:

bashCopy# In frontend directory
npm run dev

Access the application:


Frontend: http://localhost:3000
WebSocket Server: ws://localhost:3000

Testing
bashCopy# Run tests
npm test
Architecture

Backend: Node.js with WebSocket
Frontend: Next.js
Database: MySQL
Caching: Redis
Real-time Communication: WebSocket

Features

Real-time bidding
Concurrent bid handling
DDoS protection
Rate limiting
Transaction management

Documentation
See docs/technical-documentation.md for detailed system architecture and implementation details.