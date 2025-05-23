import { Injectable, NotFoundException } from '@nestjs/common'
import { BulkCreateBusinessDto } from 'src/dto/bulk-create-business.dto'
import { BusinessQueryDto } from 'src/dto/business-query.dto'
import { CreateBusinessDto } from 'src/dto/create-business.dto'
import { UpdateBusinessDto } from 'src/dto/update-business.dto'
import { v4 as uuidv4 } from 'uuid'
import { Business } from '../common/interfaces/business.interface'
import { RedisService } from './redis.service'

@Injectable()
export class BusinessService {
  private readonly BUSINESS_KEY = 'business'
  private readonly BUSINESS_LIST_KEY = 'businesses:list'
  private readonly CATEGORY_INDEX_KEY = 'index:category'
  private readonly SUBCATEGORY_INDEX_KEY = 'index:subcategory'
  private readonly FEATURED_INDEX_KEY = 'index:featured'
  private readonly ACTIVE_INDEX_KEY = 'index:active'
  private readonly SEARCH_INDEX_KEY = 'index:search'

  constructor(private redisService: RedisService) {}

  async create(createBusinessDto: CreateBusinessDto): Promise<Business> {
    const businessId = uuidv4()
    const now = new Date().toISOString()

    const business: any = {
      id: businessId,
      ...createBusinessDto,
      createdAt: now,
      updatedAt: now,
    }

    // Save business as hash
    await this.redisService.hset(`${this.BUSINESS_KEY}:${businessId}`, 'data', JSON.stringify(business))

    // Add to business list
    await this.redisService.sadd(this.BUSINESS_LIST_KEY, businessId)

    // Update indexes
    await this.updateIndexes(business)

    return business
  }

  async findAll(query: BusinessQueryDto): Promise<{
    data: Business[]
    total: number
    page: number
    limit: number
  }> {
    let businessIds: string[] = []

    // Apply filters using set intersections
    const filterSets: string[] = [this.BUSINESS_LIST_KEY]

    if (query.category) {
      filterSets.push(`${this.CATEGORY_INDEX_KEY}:${query.category}`)
    }

    if (query.subcategory) {
      filterSets.push(`${this.SUBCATEGORY_INDEX_KEY}:${query.subcategory}`)
    }

    if (query.featured !== undefined) {
      if (query.featured) {
        filterSets.push(`${this.FEATURED_INDEX_KEY}:true`)
      } else {
        filterSets.push(`${this.FEATURED_INDEX_KEY}:false`)
      }
    }

    if (query.active !== undefined) {
      if (query.active) {
        filterSets.push(`${this.ACTIVE_INDEX_KEY}:true`)
      } else {
        filterSets.push(`${this.ACTIVE_INDEX_KEY}:false`)
      }
    }

    // Get intersection of all filter sets
    if (filterSets.length === 1) {
      businessIds = await this.redisService.smembers(filterSets[0])
    } else {
      businessIds = await this.redisService.sinter(...filterSets)
    }

    // Get business data
    const businesses: Business[] = []
    for (const id of businessIds) {
      const businessData = await this.redisService.hget(`${this.BUSINESS_KEY}:${id}`, 'data')
      if (businessData) {
        businesses.push(JSON.parse(businessData))
      }
    }

    // Sort businesses
    businesses.sort((a, b) => {
      const field = query.sortBy || 'createdDate'
      const order = query.sortOrder || 'DESC'

      let aValue = a[field]
      let bValue = b[field]

      if (field === 'createdAt' || field === 'updatedAt') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      if (order === 'ASC') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    const total = businesses.length
    const offset = query.offset || 0
    const limit = query.limit || 10
    const page = Math.floor(offset / limit) + 1

    const paginatedBusinesses = businesses.slice(offset, offset + limit)

    return {
      data: paginatedBusinesses,
      total,
      page,
      limit,
    }
  }

  async findOne(id: string): Promise<Business> {
    const businessData = await this.redisService.hget(`${this.BUSINESS_KEY}:${id}`, 'data')

    if (!businessData) {
      throw new NotFoundException('Business not found')
    }

    return JSON.parse(businessData)
  }

  async update(id: string, updateBusinessDto: UpdateBusinessDto): Promise<Business> {
    const existingBusiness = await this.findOne(id)

    const updatedBusiness: Business = {
      ...existingBusiness,
      ...updateBusinessDto,
      updatedAt: new Date().toISOString(),
    }

    // Update business data
    await this.redisService.hset(`${this.BUSINESS_KEY}:${id}`, 'data', JSON.stringify(updatedBusiness))

    // Remove old indexes
    await this.removeFromIndexes(existingBusiness)

    // Add new indexes
    await this.updateIndexes(updatedBusiness)

    return updatedBusiness
  }

  async remove(id: string): Promise<void> {
    const business = await this.findOne(id)

    // Remove from business list
    await this.redisService.srem(this.BUSINESS_LIST_KEY, id)

    // Remove from indexes
    await this.removeFromIndexes(business)

    // Remove business data
    await this.redisService.del(`${this.BUSINESS_KEY}:${id}`)
  }

  async bulkCreate(bulkCreateBusinessDto: BulkCreateBusinessDto): Promise<Business[]> {
    const businesses: Business[] = []
    const pipeline = this.redisService.pipeline()

    for (const businessDto of bulkCreateBusinessDto.businesses) {
      const businessId = uuidv4()
      const now = new Date().toISOString()

      const business: any = {
        id: businessId,
        ...businessDto,
        createdAt: now,
        updatedAt: now,
      }

      businesses.push(business)

      // Add to pipeline
      pipeline.hset(`${this.BUSINESS_KEY}:${businessId}`, 'data', JSON.stringify(business))
      pipeline.sadd(this.BUSINESS_LIST_KEY, businessId)
    }

    await pipeline.exec()

    // Update indexes for all businesses
    for (const business of businesses) {
      await this.updateIndexes(business)
    }

    return businesses
  }

  private async updateIndexes(business: Business): Promise<void> {
    const { id, categoryId, subcategoryId, featured, active, name, keywords } = business

    // Category index
    await this.redisService.sadd(`${this.CATEGORY_INDEX_KEY}:${categoryId}`, id)

    // Subcategory index
    await this.redisService.sadd(`${this.SUBCATEGORY_INDEX_KEY}:${subcategoryId}`, id)

    // Featured index
    await this.redisService.sadd(`${this.FEATURED_INDEX_KEY}:${featured}`, id)

    // Active index
    await this.redisService.sadd(`${this.ACTIVE_INDEX_KEY}:${active}`, id)

    // Search index - add business name and keywords
    const searchTerms = [name.toLowerCase()]
    if (keywords) {
      searchTerms.push(...keywords.map((k) => k.toLowerCase()))
    }

    for (const term of searchTerms) {
      const words = term.split(' ')
      for (const word of words) {
        if (word.length > 2) {
          await this.redisService.sadd(`${this.SEARCH_INDEX_KEY}:${word}`, id)
        }
      }
    }

    // Add to sorted set for relevance scoring
    await this.redisService.zadd('businesses:score', Date.now(), id)
  }

  private async removeFromIndexes(business: Business): Promise<void> {
    const { id, categoryId, subcategoryId, featured, active, name, keywords } = business

    // Remove from category index
    await this.redisService.srem(`${this.CATEGORY_INDEX_KEY}:${categoryId}`, id)

    // Remove from subcategory index
    await this.redisService.srem(`${this.SUBCATEGORY_INDEX_KEY}:${subcategoryId}`, id)

    // Remove from featured index
    await this.redisService.srem(`${this.FEATURED_INDEX_KEY}:${featured}`, id)

    // Remove from active index
    await this.redisService.srem(`${this.ACTIVE_INDEX_KEY}:${active}`, id)

    // Remove from search indexes
    const searchTerms = [name.toLowerCase()]
    if (keywords) {
      searchTerms.push(...keywords.map((k) => k.toLowerCase()))
    }

    for (const term of searchTerms) {
      const words = term.split(' ')
      for (const word of words) {
        if (word.length > 2) {
          await this.redisService.srem(`${this.SEARCH_INDEX_KEY}:${word}`, id)
        }
      }
    }

    // Remove from sorted set
    await this.redisService.zrem('businesses:score', id)
  }

  async getStats(): Promise<{
    totalBusinesses: number
    activeBusinesses: number
    featuredBusinesses: number
    categoriesCount: number
  }> {
    const totalBusinesses = await this.redisService.scard(this.BUSINESS_LIST_KEY)
    const activeBusinesses = await this.redisService.scard(`${this.ACTIVE_INDEX_KEY}:true`)
    const featuredBusinesses = await this.redisService.scard(`${this.FEATURED_INDEX_KEY}:true`)

    // Get categories count (this would need category service)
    const categoryKeys = await this.redisService.keys('category:*')
    const categoriesCount = categoryKeys.length

    return {
      totalBusinesses,
      activeBusinesses,
      featuredBusinesses,
      categoriesCount,
    }
  }
}
