-- schema.sql

-- Create tables
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cars (
    car_id INT PRIMARY KEY AUTO_INCREMENT,
    make VARCHAR(255) NOT NULL,
    model VARCHAR(255) NOT NULL,
    year INT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE auctions (
    auction_id INT PRIMARY KEY AUTO_INCREMENT,
    car_id INT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    starting_price DECIMAL(10, 2) NOT NULL,
    highest_bid DECIMAL(10, 2),
    status ENUM('pending', 'active', 'ended') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (car_id) REFERENCES cars(car_id),
    INDEX idx_status_endtime (status, end_time)
);

CREATE TABLE bids (
    bid_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    auction_id INT NOT NULL,
    bid_amount DECIMAL(10, 2) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (auction_id) REFERENCES auctions(auction_id),
    INDEX idx_auction_amount (auction_id, bid_amount)
);

-- Insert initial test data
INSERT INTO cars (car_id, make, model, year, description)
VALUES (1, 'Toyota', 'Camry', 2023, 'Brand new sedan');

INSERT INTO users (user_id, username, email, password_hash)
VALUES (1, 'testuser', 'test@example.com', 'password_hash');