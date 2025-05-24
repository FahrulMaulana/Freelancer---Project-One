// src/category/category.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Category, Subcategory } from 'src/common/interfaces/business.interface'
import { CreateCategoryDto } from 'src/dto/create-category.dto'
import { CreateSubcategoryDto } from 'src/dto/create-subcategory.dto'
import { UpdateCategoryDto } from 'src/dto/update-category.dto'
import { UpdateSubcategoryDto } from 'src/dto/update-subcategory.dto'
import { v4 as uuidv4 } from 'uuid'
import { RedisService } from './redis.service'

@Injectable()
export class CategoryService {
  private readonly CATEGORY_KEY = 'category'
  private readonly SUBCATEGORY_KEY = 'subcategory'
  private readonly CATEGORY_LIST_KEY = 'categories:list'
  private readonly SUBCATEGORY_LIST_KEY = 'subcategories:list'
  private readonly CATEGORY_SUBCATEGORIES_KEY = 'category:subcategories'

  constructor(private redisService: RedisService) {}

  // Category methods
  async createCategory(createCategoryDto: CreateCategoryDto): Promise<Category> {
    // Check if slug already exists
    const existingSlug = await this.findCategoryBySlug(createCategoryDto.slug)
    if (existingSlug) {
      throw new BadRequestException('Category slug already exists')
    }

    const categoryId = uuidv4()
    const now = new Date().toISOString()

    const category: any = {
      id: categoryId,
      ...createCategoryDto,
      createdAt: now,
      updatedAt: now,
    }

    // Save category
    await this.redisService.hset(`${this.CATEGORY_KEY}:${categoryId}`, 'data', JSON.stringify(category))

    // Add to category list
    await this.redisService.sadd(this.CATEGORY_LIST_KEY, categoryId)

    // Create slug index
    await this.redisService.set(`category:slug:${category.slug}`, categoryId)

    return category
  }

  async findAllCategories(): Promise<Category[]> {
    const categoryIds = await this.redisService.smembers(this.CATEGORY_LIST_KEY)
    const categories: Category[] = []

    for (const id of categoryIds) {
      const categoryData = await this.redisService.hget(`${this.CATEGORY_KEY}:${id}`, 'data')
      if (categoryData) {
        categories.push(JSON.parse(categoryData))
      }
    }

    // Sort by sortOrder and name
    return categories.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder
      }
      return a.name.localeCompare(b.name)
    })
  }

  async findCategoryById(id: string): Promise<Category> {
    const categoryData = await this.redisService.hget(`${this.CATEGORY_KEY}:${id}`, 'data')

    if (!categoryData) {
      throw new NotFoundException('Category not found')
    }

    return JSON.parse(categoryData)
  }

  async findCategoryBySlug(slug: string): Promise<Category | null> {
    const categoryId = await this.redisService.get(`category:slug:${slug}`)

    if (!categoryId) {
      return null
    }

    return this.findCategoryById(categoryId)
  }

  async updateCategory(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    const existingCategory = await this.findCategoryById(id)

    // Check slug uniqueness if changed
    if (updateCategoryDto.slug && updateCategoryDto.slug !== existingCategory.slug) {
      const existingSlug = await this.findCategoryBySlug(updateCategoryDto.slug)
      if (existingSlug) {
        throw new BadRequestException('Category slug already exists')
      }
    }

    const updatedCategory: Category = {
      ...existingCategory,
      ...updateCategoryDto,
      updatedAt: new Date().toISOString(),
    }

    // Update category data
    await this.redisService.hset(`${this.CATEGORY_KEY}:${id}`, 'data', JSON.stringify(updatedCategory))

    // Update slug index if changed
    if (updateCategoryDto.slug && updateCategoryDto.slug !== existingCategory.slug) {
      await this.redisService.del(`category:slug:${existingCategory.slug}`)
      await this.redisService.set(`category:slug:${updatedCategory.slug}`, id)
    }

    return updatedCategory
  }

  async removeCategory(id: string): Promise<void> {
    const category = await this.findCategoryById(id)

    // Check if category has subcategories
    const subcategories = await this.findSubcategoriesByCategory(id)
    if (subcategories.length > 0) {
      throw new BadRequestException('Cannot delete category with existing subcategories')
    }

    // Remove from category list
    await this.redisService.srem(this.CATEGORY_LIST_KEY, id)

    // Remove slug index
    await this.redisService.del(`category:slug:${category.slug}`)

    // Remove category data
    await this.redisService.del(`${this.CATEGORY_KEY}:${id}`)
  }

  // Subcategory methods
  async createSubcategory(createSubcategoryDto: CreateSubcategoryDto): Promise<Subcategory> {
    // Verify category exists
    await this.findCategoryById(createSubcategoryDto.categoryId)

    // Check if slug already exists within the category
    const existingSlug = await this.findSubcategoryBySlug(createSubcategoryDto.slug, createSubcategoryDto.categoryId)
    if (existingSlug) {
      throw new BadRequestException('Subcategory slug already exists in this category')
    }

    const subcategoryId = uuidv4()
    const now = new Date().toISOString()

    const subcategory: any = {
      id: subcategoryId,
      ...createSubcategoryDto,
      createdAt: now,
      updatedAt: now,
    }

    // Save subcategory
    await this.redisService.hset(`${this.SUBCATEGORY_KEY}:${subcategoryId}`, 'data', JSON.stringify(subcategory))

    // Add to subcategory list
    await this.redisService.sadd(this.SUBCATEGORY_LIST_KEY, subcategoryId)

    // Add to category's subcategories
    await this.redisService.sadd(`${this.CATEGORY_SUBCATEGORIES_KEY}:${createSubcategoryDto.categoryId}`, subcategoryId)

    // Create slug index
    await this.redisService.set(`subcategory:slug:${createSubcategoryDto.categoryId}:${subcategory.slug}`, subcategoryId)

    return subcategory
  }

  async findAllSubcategories(): Promise<Subcategory[]> {
    const subcategoryIds = await this.redisService.smembers(this.SUBCATEGORY_LIST_KEY)
    const subcategories: Subcategory[] = []

    for (const id of subcategoryIds) {
      const subcategoryData = await this.redisService.hget(`${this.SUBCATEGORY_KEY}:${id}`, 'data')
      if (subcategoryData) {
        subcategories.push(JSON.parse(subcategoryData))
      }
    }

    return subcategories.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder
      }
      return a.name.localeCompare(b.name)
    })
  }

  async findSubcategoriesByCategory(categoryId: string): Promise<Subcategory[]> {
    const subcategoryIds = await this.redisService.smembers(`${this.CATEGORY_SUBCATEGORIES_KEY}:${categoryId}`)
    const subcategories: Subcategory[] = []

    for (const id of subcategoryIds) {
      const subcategoryData = await this.redisService.hget(`${this.SUBCATEGORY_KEY}:${id}`, 'data')
      if (subcategoryData) {
        subcategories.push(JSON.parse(subcategoryData))
      }
    }

    return subcategories.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder
      }
      return a.name.localeCompare(b.name)
    })
  }

  async findSubcategoryById(id: string): Promise<Subcategory> {
    const subcategoryData = await this.redisService.hget(`${this.SUBCATEGORY_KEY}:${id}`, 'data')

    if (!subcategoryData) {
      throw new NotFoundException('Subcategory not found')
    }

    return JSON.parse(subcategoryData)
  }

  async findSubcategoryBySlug(slug: string, categoryId: string): Promise<Subcategory | null> {
    const subcategoryId = await this.redisService.get(`subcategory:slug:${categoryId}:${slug}`)

    if (!subcategoryId) {
      return null
    }

    return this.findSubcategoryById(subcategoryId)
  }

  async updateSubcategory(id: string, updateSubcategoryDto: UpdateSubcategoryDto): Promise<Subcategory> {
    const existingSubcategory = await this.findSubcategoryById(id)

    // Check slug uniqueness if changed
    if (updateSubcategoryDto.slug && updateSubcategoryDto.slug !== existingSubcategory.slug) {
      const categoryId = updateSubcategoryDto.categoryId || existingSubcategory.categoryId
      const existingSlug = await this.findSubcategoryBySlug(updateSubcategoryDto.slug, categoryId)
      if (existingSlug) {
        throw new BadRequestException('Subcategory slug already exists in this category')
      }
    }

    const updatedSubcategory: Subcategory = {
      ...existingSubcategory,
      ...updateSubcategoryDto,
      updatedAt: new Date().toISOString(),
    }

    // Update subcategory data
    await this.redisService.hset(`${this.SUBCATEGORY_KEY}:${id}`, 'data', JSON.stringify(updatedSubcategory))

    // Handle category change
    if (updateSubcategoryDto.categoryId && updateSubcategoryDto.categoryId !== existingSubcategory.categoryId) {
      // Remove from old category
      await this.redisService.srem(`${this.CATEGORY_SUBCATEGORIES_KEY}:${existingSubcategory.categoryId}`, id)
      // Add to new category
      await this.redisService.sadd(`${this.CATEGORY_SUBCATEGORIES_KEY}:${updateSubcategoryDto.categoryId}`, id)
      // Update slug index
      await this.redisService.del(`subcategory:slug:${existingSubcategory.categoryId}:${existingSubcategory.slug}`)
      await this.redisService.set(`subcategory:slug:${updateSubcategoryDto.categoryId}:${updatedSubcategory.slug}`, id)
    } else if (updateSubcategoryDto.slug && updateSubcategoryDto.slug !== existingSubcategory.slug) {
      // Update slug index for same category
      await this.redisService.del(`subcategory:slug:${existingSubcategory.categoryId}:${existingSubcategory.slug}`)
      await this.redisService.set(`subcategory:slug:${existingSubcategory.categoryId}:${updatedSubcategory.slug}`, id)
    }

    return updatedSubcategory
  }

  async removeSubcategory(id: string): Promise<void> {
    const subcategory = await this.findSubcategoryById(id)

    // Remove from subcategory list
    await this.redisService.srem(this.SUBCATEGORY_LIST_KEY, id)

    // Remove from category's subcategories
    await this.redisService.srem(`${this.CATEGORY_SUBCATEGORIES_KEY}:${subcategory.categoryId}`, id)

    // Remove slug index
    await this.redisService.del(`subcategory:slug:${subcategory.categoryId}:${subcategory.slug}`)

    // Remove subcategory data
    await this.redisService.del(`${this.SUBCATEGORY_KEY}:${id}`)
  }

  async getCategoriesWithSubcategories(): Promise<(Category & { subcategories: Subcategory[]; businessCount: number })[]> {
    const categories = await this.findAllCategories()
    const result: (Category & { subcategories: Subcategory[]; businessCount: number })[] = []

    for (const category of categories) {
      const subcategories = await this.findSubcategoriesByCategory(category.id)

      // Get business count for this category
      const businessCount = await this.getBusinessCountForCategory(category.id)

      result.push({
        ...category,
        subcategories,
        businessCount,
      })
    }

    return result
  }

  // Add this new method to get business count
  async getBusinessCountForCategory(categoryId: string): Promise<number> {
    // Get businesses directly using this category
    const directBusinesses = (await this.redisService.scard(`category:businesses:${categoryId}`)) || 0

    // Return total count (businesses directly in category + businesses in subcategories)
    return directBusinesses
  }
}
