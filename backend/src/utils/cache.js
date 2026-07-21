import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

let redisClient = null;
let isRedisConnected = false;

// Fallback in-memory cache map
const memoryCache = new Map();

if (process.env.REDIS_URL) {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 2000,
        reconnectStrategy: (retries) => {
          if (retries > 2) {
            console.warn('[Cache] Redis connection retry attempts exhausted. Operating on in-memory backend cache fallback.');
            isRedisConnected = false;
            return false; // Stop retrying connection
          }
          return 1000;
        }
      }
    });

    redisClient.on('error', (err) => {
      // Don't crash the server: downgrade to in-memory fallback
      isRedisConnected = false;
    });

    redisClient.on('ready', () => {
      console.log('[Cache] Redis client is connected and ready.');
      isRedisConnected = true;
    });

    // Attempt async connection
    redisClient.connect().catch((err) => {
      console.warn('[Cache] Redis connection failed during init. In-memory cache is active.');
      isRedisConnected = false;
    });
  } catch (err) {
    console.error('[Cache] Redis initialization error:', err);
    isRedisConnected = false;
  }
} else {
  console.log('[Cache] REDIS_URL not configured. Operating on in-memory cache.');
}

/**
 * Get value from Redis cache (or in-memory cache fallback)
 * @param {string} key 
 */
export async function getCache(key) {
  if (isRedisConnected && redisClient) {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('[Cache] Redis read error, using in-memory fallbacks', e.message);
    }
  }

  // Memory fallback query
  const cachedVal = memoryCache.get(key);
  if (!cachedVal) return null;
  
  if (Date.now() > cachedVal.expiryTime) {
    memoryCache.delete(key);
    return null;
  }
  return cachedVal.data;
}

/**
 * Set value in Redis cache (or in-memory cache fallback)
 * @param {string} key 
 * @param {any} value 
 * @param {number} ttlSeconds (default: 12 hours)
 */
export async function setCache(key, value, ttlSeconds = 43200) {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.set(key, JSON.stringify(value), {
        EX: ttlSeconds
      });
      return true;
    } catch (e) {
      console.warn('[Cache] Redis write error, saving to in-memory maps', e.message);
    }
  }

  // Memory fallback insert
  memoryCache.set(key, {
    data: value,
    expiryTime: Date.now() + (ttlSeconds * 1000)
  });
  return true;
}

/**
 * Remove specific key from cache
 * @param {string} key 
 */
export async function deleteCache(key) {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.del(key);
      return true;
    } catch (e) {
      console.warn('[Cache] Redis delete error', e.message);
    }
  }
  
  memoryCache.delete(key);
  return true;
}

/**
 * Flush all cached entries
 */
export async function flushCache() {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.flushAll();
      console.log('[Cache] Redis database cache flushed.');
      return true;
    } catch (e) {
      console.warn('[Cache] Redis flush error', e.message);
    }
  }
  
  memoryCache.clear();
  console.log('[Cache] In-memory fallback cache cleared.');
  return true;
}

/**
 * Check if Redis backend is active
 * @returns {boolean}
 */
export function isRedisActive() {
  return isRedisConnected;
}
