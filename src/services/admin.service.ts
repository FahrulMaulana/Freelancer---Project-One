import { Injectable } from '@nestjs/common'
import { BusinessService } from './business.service'
import { CategoryService } from './category.service'
import { RedisService } from './redis.service'

@Injectable()
export class AdminService {
  constructor(private redisService: RedisService, private businessService: BusinessService, private categoryService: CategoryService) {}

  async getDashboardStats(): Promise<{
    totalBusinesses: number
    activeBusinesses: number
    featuredBusinesses: number
    totalCategories: number
    totalSubcategories: number
    totalUsers: number
    totalAdmins: number
    recentBusinesses: any[]
  }> {
    // Get business stats
    const businessStats = await this.businessService.getStats()

    // Get user/admin counts
    const totalUsers = await this.redisService.scard('users:list')
    const totalAdmins = await this.redisService.scard('admins:list')

    // Get category/subcategory counts
    const totalCategories = await this.redisService.scard('categories:list')
    const totalSubcategories = await this.redisService.scard('subcategories:list')

    // Get recent businesses (last 5)
    const businessQuery = { limit: 5, offset: 0, sortBy: 'createdAt', sortOrder: 'DESC' as const }
    const recentBusinessesResult = await this.businessService.findAll(businessQuery)

    return {
      ...businessStats,
      totalCategories,
      totalSubcategories,
      totalUsers,
      totalAdmins,
      recentBusinesses: recentBusinessesResult.data,
    }
  }

  async getSystemHealth(): Promise<{
    redis: boolean
    totalKeys: number
    memoryUsage: string
    uptime: number
  }> {
    try {
      // Test Redis connectivity
      await this.redisService.set('health_check', 'ok', 10)
      const healthCheck = await this.redisService.get('health_check')

      // Get Redis info
      const keys = await this.redisService.keys('*')
      const totalKeys = keys.length

      return {
        redis: healthCheck === 'ok',
        totalKeys,
        memoryUsage: 'N/A', // Would need Redis INFO command
        uptime: process.uptime(),
      }
    } catch (error) {
      return {
        redis: false,
        totalKeys: 0,
        memoryUsage: 'N/A',
        uptime: process.uptime(),
      }
    }
  }
}
