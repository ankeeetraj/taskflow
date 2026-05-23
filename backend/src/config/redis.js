const Redis = require('ioredis');
require('dotenv').config();

const redisClient = new Redis(process.env.REDIS_URL, {
  tls: { rejectUnauthorized: false }
});

redisClient.on('connect', () => {
  console.log('Connected to Redis cache');
});

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

module.exports = redisClient;
