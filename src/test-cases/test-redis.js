const Redis = require('ioredis');

console.log('Attempting to connect to Redis...');

const redis = new Redis({
  host: '127.0.0.1',  // Using localhost since that worked in CLI
  port: 6379,
  password: 'mysecurepassword',  // The password that worked in CLI
  connectTimeout: 10000,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('connect', () => {
  console.log('Connected to Redis!');
});

redis.on('error', (error) => {
  console.error('Redis connection error:', error.message);
});

// Test the connection
redis.ping()
  .then(() => {
    console.log('Redis PING successful!');
    console.log('Testing set and get...');
    return redis.set('test', 'Hello Redis');
  })
  .then(() => {
    return redis.get('test');
  })
  .then((value) => {
    console.log('Retrieved test value:', value);
    redis.disconnect();
  })
  .catch((error) => {
    console.error('Redis operation failed:', error.message);
    redis.disconnect();
  });