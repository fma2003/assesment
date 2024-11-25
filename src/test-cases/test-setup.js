const mysql = require('mysql2/promise');
const Redis = require('ioredis');
require('dotenv').config();

async function testConnections() {
  // Test MySQL connection
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    console.log('MySQL connection successful');
    await connection.end();
  } catch (error) {
    console.error('MySQL connection failed:', error);
  }

  // Test Redis connection
  try {
    const redis = new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD
    });
    
    await redis.ping();
    console.log('Redis connection successful');
    redis.disconnect();
  } catch (error) {
    console.error('Redis connection failed:', error);
  }
}

testConnections();