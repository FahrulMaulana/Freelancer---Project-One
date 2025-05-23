import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import Redis from 'ioredis'

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis

  onModuleInit() {
    this.client = new Redis({
      host: '127.0.0.1',
      port: 6379,
      password: process.env.REDIS_PASSWORD,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    })

    this.client.on('connect', () => {
      console.log('✅ Redis connected')
    })

    this.client.on('error', (err) => {
      console.error('❌ Redis error', err)
    })
  }

  onModuleDestroy() {
    this.client.quit()
  }

  // Public getter if you need direct access
  getClient(): Redis {
    return this.client
  }

  // Hash operations for businesses
  async hset(key: string, field: string, value: string): Promise<number> {
    return this.client.hset(key, field, value)
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field)
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key)
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    return this.client.hdel(key, ...fields)
  }

  async hexists(key: string, field: string): Promise<number> {
    return this.client.hexists(key, field)
  }

  // Set operations for indexes
  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.client.sadd(key, ...members)
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    return this.client.srem(key, ...members)
  }

  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key)
  }

  async sinter(...keys: string[]): Promise<string[]> {
    return this.client.sinter(...keys)
  }

  // Sorted set operations for search scoring
  async zadd(key: string, score: number, member: string): Promise<number> {
    return this.client.zadd(key, score, member)
  }

  async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.zrevrange(key, start, stop)
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    return this.client.zrem(key, ...members)
  }

  // String operations
  async set(key: string, value: string, ttl?: number): Promise<string> {
    if (ttl) {
      return this.client.setex(key, ttl, value)
    }
    return this.client.set(key, value)
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key)
  }

  async del(key: string): Promise<number> {
    return this.client.del(key)
  }

  async exists(key: string): Promise<number> {
    return this.client.exists(key)
  }

  // List operations
  async lpush(key: string, ...values: string[]): Promise<number> {
    return this.client.lpush(key, ...values)
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.lrange(key, start, stop)
  }

  async llen(key: string): Promise<number> {
    return this.client.llen(key)
  }

  // Key operations
  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern)
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key)
  }

  async decr(key: string): Promise<number> {
    return this.client.decr(key)
  }

  async scard(key: string): Promise<number> {
    return this.client.scard(key)
  }

  // Pipeline operations for bulk operations
  pipeline() {
    return this.client.pipeline()
  }
}
