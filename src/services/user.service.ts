// src/user/user.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { AddFavoriteDto } from 'src/dto/add-favorite.dto'
import { User } from '../common/interfaces/business.interface'
import { RedisService } from './redis.service'

@Injectable()
export class UserService {
  private readonly USER_KEY = 'user'
  private readonly BUSINESS_KEY = 'business'

  constructor(private redisService: RedisService) {}

  async getUserProfile(userId: string): Promise<Omit<User, 'password'>> {
    const userData = await this.redisService.hget(`${this.USER_KEY}:${userId}`, 'data')

    if (!userData) {
      throw new NotFoundException('User not found')
    }

    const user = JSON.parse(userData)
    const { password, ...userWithoutPassword } = user
    return userWithoutPassword
  }

  async addFavorite(userId: string, addFavoriteDto: AddFavoriteDto): Promise<void> {
    const user = await this.findUserById(userId)
    const { businessId } = addFavoriteDto

    // Check if business exists
    const businessExists = await this.redisService.hexists(`${this.BUSINESS_KEY}:${businessId}`, 'data')
    if (!businessExists) {
      throw new NotFoundException('Business not found')
    }

    // Check if already in favorites
    if (user.favorites.includes(businessId)) {
      throw new BadRequestException('Business already in favorites')
    }

    // Add to favorites
    user.favorites.push(businessId)
    user.updatedAt = new Date().toISOString()

    await this.redisService.hset(`${this.USER_KEY}:${userId}`, 'data', JSON.stringify(user))
  }

  async removeFavorite(userId: string, businessId: string): Promise<void> {
    const user = await this.findUserById(userId)

    // Check if in favorites
    const favoriteIndex = user.favorites.indexOf(businessId)
    if (favoriteIndex === -1) {
      throw new NotFoundException('Business not in favorites')
    }

    // Remove from favorites
    user.favorites.splice(favoriteIndex, 1)
    user.updatedAt = new Date().toISOString()

    await this.redisService.hset(`${this.USER_KEY}:${userId}`, 'data', JSON.stringify(user))
  }

  async getFavorites(userId: string): Promise<any[]> {
    const user = await this.findUserById(userId)
    const favorites: any[] = []

    for (const businessId of user.favorites) {
      const businessData = await this.redisService.hget(`${this.BUSINESS_KEY}:${businessId}`, 'data')
      if (businessData) {
        favorites.push(JSON.parse(businessData))
      }
    }

    return favorites
  }

  private async findUserById(userId: string): Promise<User> {
    const userData = await this.redisService.hget(`${this.USER_KEY}:${userId}`, 'data')

    if (!userData) {
      throw new NotFoundException('User not found')
    }

    return JSON.parse(userData)
  }
}
