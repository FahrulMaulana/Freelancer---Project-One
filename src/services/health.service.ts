import { Injectable } from '@nestjs/common'
import { RedisService } from './redis.service'

@Injectable()
export class HealthService {
  constructor(private redisService: RedisService) {}

  async check(): Promise<{
    status: string
    timestamp: string
    uptime: number
    redis: boolean
  }> {
    const timestamp = new Date().toISOString()
    const uptime = process.uptime()

    let redisStatus = false
    try {
      await this.redisService.set('health_check', 'ok', 10)
      const result = await this.redisService.get('health_check')
      redisStatus = result === 'ok'
    } catch (error) {
      redisStatus = false
    }

    return {
      status: redisStatus ? 'healthy' : 'unhealthy',
      timestamp,
      uptime,
      redis: redisStatus,
    }
  }

  async ready(): Promise<{ status: string }> {
    try {
      await this.redisService.get('health_check')
      return { status: 'ready' }
    } catch (error) {
      return { status: 'not ready' }
    }
  }

  async live(): Promise<{ status: string }> {
    return { status: 'alive' }
  }
}
