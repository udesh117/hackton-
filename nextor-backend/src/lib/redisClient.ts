import Redis from "ioredis";

// This will automatically read the REDIS_URL from your .env file
// For Docker Redis, use 127.0.0.1 instead of localhost to force IPv4
const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: 3, // Reduce retries to avoid long delays
  retryStrategy: (times) => {
    if (times > 3) {
      console.error("Redis: Max retries reached, giving up");
      return null; // Stop retrying
    }
    return Math.min(times * 50, 2000); // Exponential backoff
  },
  lazyConnect: true, // Don't connect immediately
  enableOfflineQueue: false, // Don't queue commands when offline
  connectTimeout: 10000, // 10 second connection timeout
  family: 4, // Force IPv4 to avoid IPv6 issues with Docker
});

redisClient.on("connect", () => {
  console.log("✅ Connected to Redis successfully!");
});

redisClient.on("error", (error) => {
  console.error("⚠️ Redis connection error:", error.message);
});

redisClient.on("ready", () => {
  console.log("✅ Redis is ready to accept commands");
});

// Try to connect, but don't fail if it doesn't work
redisClient.connect().catch((error) => {
  console.warn("⚠️ Redis connection failed, continuing without Redis:", error.message);
  console.warn("⚠️ Email verification tokens will not be stored. Please set up Redis for production.");
});

export default redisClient;