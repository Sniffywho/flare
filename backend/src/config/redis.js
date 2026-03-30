const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient = null;

/**
 * Returns a singleton Redis client.
 * If REDIS_URL is not set, Redis features are silently disabled — the
 * app will still work without caching/pub-sub.
 */
const getRedisClient = () => {
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    logger.warn('REDIS_URL not set — Redis features disabled');
    return null;
  }

  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    enableReadyCheck: true,
  });

  redisClient.on('connect', () => logger.info('Redis connected'));
  redisClient.on('error', (err) => logger.error(`Redis error: ${err.message}`));
  redisClient.on('close', () => logger.warn('Redis connection closed'));

  return redisClient;
};

/**
 * Set a key with an optional TTL (seconds).
 */
const setCache = async (key, value, ttl = 3600) => {
  const client = getRedisClient();
  if (!client) return;
  try {
    await client.set(key, JSON.stringify(value), 'EX', ttl);
  } catch (err) {
    logger.error(`Redis setCache error: ${err.message}`);
  }
};

/**
 * Get a cached value by key. Returns null on miss or error.
 */
const getCache = async (key) => {
  const client = getRedisClient();
  if (!client) return null;
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    logger.error(`Redis getCache error: ${err.message}`);
    return null;
  }
};

/**
 * Delete one or more cache keys.
 */
const delCache = async (...keys) => {
  const client = getRedisClient();
  if (!client) return;
  try {
    await client.del(...keys);
  } catch (err) {
    logger.error(`Redis delCache error: ${err.message}`);
  }
};

module.exports = { getRedisClient, setCache, getCache, delCache };
