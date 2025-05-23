// src/search/search.service.ts
import { Injectable } from '@nestjs/common'
import { SearchQueryDto } from 'src/dto/search-query.dto'
import { Business, Category } from '../common/interfaces/business.interface'
import { RedisService } from './redis.service'

@Injectable()
export class SearchService {
  private readonly BUSINESS_KEY = 'business'
  private readonly SEARCH_INDEX_KEY = 'index:search'
  private readonly CATEGORY_INDEX_KEY = 'index:category'
  private readonly SUBCATEGORY_INDEX_KEY = 'index:subcategory'

  constructor(private redisService: RedisService) {}

  // Ubah tipe return dari fungsi search untuk menyertakan kategori
  async search(searchQuery: SearchQueryDto): Promise<{
    data: Business[]
    categories: Partial<Category>[]
    total: number
    page: number
    limit: number | undefined
    query: string
  }> {
    const { q, category, subcategory, limit, offset, sortBy } = searchQuery

    // Tokenize search query
    const searchTerms = this.tokenizeQuery(q)

    // ===== PARALLEL SEARCH: Business dan Category =====
    const [businessResults, categoryResults] = await Promise.all([
      this.searchBusinesses(searchTerms, category, subcategory),
      this.searchCategories(searchTerms),
    ])

    // ===== PROCESS BUSINESS RESULTS =====
    const businesses: (Business & { relevanceScore: number })[] = []

    for (const id of businessResults) {
      const businessData = await this.redisService.hget(`${this.BUSINESS_KEY}:${id}`, 'data')
      if (businessData) {
        const business = JSON.parse(businessData)
        const relevanceScore = this.calculateRelevanceScore(business, searchTerms)
        businesses.push({ ...business, relevanceScore })
      }
    }

    // Sort businesses
    businesses.sort((a, b) => {
      switch (sortBy) {
        case 'relevance':
          return b.relevanceScore - a.relevanceScore
        case 'name':
          return a.name.localeCompare(b.name)
        case 'rating':
          return b.rating - a.rating
        case 'createdAt':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        default:
          return b.relevanceScore - a.relevanceScore
      }
    })

    // Pagination
    const total = businesses.length
    const page = Math.floor((offset ?? 0) / (limit ?? 1)) + 1
    const paginatedBusinesses = businesses.slice(offset ?? 0, (offset ?? 0) + (limit ?? businesses.length))

    // Remove relevanceScore from response
    const cleanBusinesses = paginatedBusinesses.map(({ relevanceScore, ...business }) => business)

    return {
      data: cleanBusinesses,
      categories: categoryResults,
      total,
      page,
      limit,
      query: q,
    }
  }

  // ===== HELPER METHODS =====

  private async searchBusinesses(searchTerms: string[], category?: string, subcategory?: string): Promise<string[]> {
    // Search businesses by search terms
    let searchResults: Set<string> = new Set()

    for (const term of searchTerms) {
      const businessIds = await this.redisService.smembers(`${this.SEARCH_INDEX_KEY}:${term}`)
      if (searchResults.size === 0) {
        searchResults = new Set(businessIds)
      } else {
        // Intersection for AND search
        searchResults = new Set(businessIds.filter((id) => searchResults.has(id)))
      }
    }

    let finalResults = Array.from(searchResults)

    // Apply category filter
    if (category) {
      const categoryBusinessIds = await this.redisService.smembers(`${this.CATEGORY_INDEX_KEY}:${category}`)
      finalResults = finalResults.filter((id) => categoryBusinessIds.includes(id))
    }

    // Apply subcategory filter
    if (subcategory) {
      const subcategoryBusinessIds = await this.redisService.smembers(`${this.SUBCATEGORY_INDEX_KEY}:${subcategory}`)
      finalResults = finalResults.filter((id) => subcategoryBusinessIds.includes(id))
    }

    return finalResults
  }

  private async searchCategories(searchTerms: string[]): Promise<Partial<Category>[]> {
    interface CategoryWithCount extends Partial<Category> {
      count?: number
    }

    const matchingCategories: CategoryWithCount[] = []

    // Get all category IDs
    const allCategoryIds = await this.redisService.smembers('categories')

    // Search categories in parallel for better performance
    const categoryPromises = allCategoryIds.map(async (categoryId) => {
      const categoryData = await this.redisService.hget(`category:${categoryId}`, 'data')
      if (!categoryData) return null

      try {
        const category = JSON.parse(categoryData)

        // Check if category name matches any search term
        const categoryMatches = searchTerms.some(
          (term) =>
            category.name.toLowerCase().includes(term.toLowerCase()) ||
            (category.description && category.description.toLowerCase().includes(term.toLowerCase()))
        )

        if (categoryMatches) {
          // Get business count for this category
          const businessCount = await this.redisService.scard(`${this.CATEGORY_INDEX_KEY}:${categoryId}`)

          return {
            id: categoryId,
            name: category.name,
            icon: category.icon,
            count: businessCount,
            description: category.description,
          } as CategoryWithCount // Tambahkan type assertion di sini
        }
      } catch (err) {
        console.error(`Error parsing category data for ${categoryId}:`, err)
      }

      return null
    })

    const categoryResults = await Promise.all(categoryPromises)

    // Perbaikan: Filter item null terlebih dahulu dan gunakan type assertion
    const filteredResults = categoryResults.filter((result): result is CategoryWithCount => result !== null)
    matchingCategories.push(...filteredResults)

    // Sort categories by relevance and business count
    matchingCategories.sort((a, b) => {
      // Categories that start with search term are more relevant
      const aStartsWithTerm = searchTerms.some((term) => (a.name ?? '').toLowerCase().startsWith(term.toLowerCase()))
      const bStartsWithTerm = searchTerms.some((term) => (b.name ?? '').toLowerCase().startsWith(term.toLowerCase()))

      if (aStartsWithTerm && !bStartsWithTerm) return -1
      if (!aStartsWithTerm && bStartsWithTerm) return 1

      // If both have same relevance, sort by business count
      return (b.count || 0) - (a.count || 0)
    })

    // Limit categories to top 5
    return matchingCategories.slice(0, 5)
  }

  // ===== ENHANCED SUGGESTIONS =====
  async getSuggestions(query: string): Promise<string[]> {
    const searchTerms = this.tokenizeQuery(query)
    const suggestions = new Map<string, number>() // Use Map to track scores

    // Get suggestions from business search index, category names, and business names
    const [businessSuggestions, categorySuggestions, businessNameSuggestions] = await Promise.all([
      this.getBusinessSearchSuggestions(searchTerms),
      this.getCategorySuggestions(searchTerms),
      this.getBusinessNameSuggestions(query),
    ])

    // Combine all suggestions with scoring
    businessSuggestions.forEach((suggestion) => {
      suggestions.set(suggestion.term, (suggestions.get(suggestion.term) || 0) + suggestion.score)
    })

    categorySuggestions.forEach((suggestion) => {
      suggestions.set(suggestion.term, (suggestions.get(suggestion.term) || 0) + suggestion.score)
    })

    businessNameSuggestions.forEach((suggestion) => {
      suggestions.set(suggestion.term, (suggestions.get(suggestion.term) || 0) + suggestion.score)
    })

    // Sort by score and relevance
    const sortedSuggestions = Array.from(suggestions.entries())
      .sort((a, b) => {
        // Prioritize exact prefix matches
        const aStartsWithQuery = a[0].toLowerCase().startsWith(query.toLowerCase())
        const bStartsWithQuery = b[0].toLowerCase().startsWith(query.toLowerCase())

        if (aStartsWithQuery && !bStartsWithQuery) return -1
        if (!aStartsWithQuery && bStartsWithQuery) return 1

        // Then sort by score
        return b[1] - a[1]
      })
      .map(([term]) => term)

    return sortedSuggestions.slice(0, 10)
  }

  private async getBusinessSearchSuggestions(searchTerms: string[]): Promise<Array<{ term: string; score: number }>> {
    const suggestions: Array<{ term: string; score: number }> = []

    for (const term of searchTerms) {
      try {
        // Get all keys that contain the search term (not just prefix)
        const keys = await this.redisService.keys(`${this.SEARCH_INDEX_KEY}:*${term}*`)

        for (const key of keys) {
          const word = key.replace(`${this.SEARCH_INDEX_KEY}:`, '')

          if (word.length > term.length && word.includes(term)) {
            // Score based on position and length
            let score = 1
            if (word.startsWith(term)) score += 3 // Prefix match gets higher score
            if (word.toLowerCase() === term.toLowerCase()) score += 5 // Exact match

            suggestions.push({ term: word, score })
          }
        }
      } catch (error) {
        console.error(`Error getting business search suggestions for term "${term}":`, error)
      }
    }

    return suggestions
  }

  private async getCategorySuggestions(searchTerms: string[]): Promise<Array<{ term: string; score: number }>> {
    const suggestions: Array<{ term: string; score: number }> = []

    try {
      const allCategoryIds = await this.redisService.smembers('categories')

      const categoryPromises = allCategoryIds.map(async (categoryId) => {
        const categoryData = await this.redisService.hget(`category:${categoryId}`, 'data')
        if (!categoryData) return []

        const category = JSON.parse(categoryData)
        const categoryResults: Array<{ term: string; score: number }> = []

        for (const term of searchTerms) {
          if (category.name.toLowerCase().includes(term.toLowerCase())) {
            let score = 2 // Base score for category matches
            if (category.name.toLowerCase().startsWith(term.toLowerCase())) score += 2

            categoryResults.push({ term: category.name, score })
          }

          // Also check description
          if (category.description && category.description.toLowerCase().includes(term.toLowerCase())) {
            categoryResults.push({ term: category.name, score: 1 })
          }
        }

        return categoryResults
      })

      const allCategoryResults = await Promise.all(categoryPromises)
      suggestions.push(...allCategoryResults.flat())
    } catch (error) {
      console.error('Error getting category suggestions:', error)
    }

    return suggestions
  }

  // Solusi untuk error di getBusinessNameSuggestions
  private async getBusinessNameSuggestions(query: string): Promise<Array<{ term: string; score: number }>> {
    const suggestions: Array<{ term: string; score: number }> = []

    try {
      // Get all business IDs and check their names
      const allBusinessKeys = await this.redisService.keys(`${this.BUSINESS_KEY}:*`)

      const businessPromises = allBusinessKeys.map(async (businessKey) => {
        const businessData = await this.redisService.hget(businessKey, 'data')
        if (!businessData) return null

        const business = JSON.parse(businessData)
        const businessName = business.name.toLowerCase()
        const queryLower = query.toLowerCase()

        if (businessName.includes(queryLower)) {
          let score = 1
          if (businessName.startsWith(queryLower)) score += 4 // Prefix match
          if (business.featured) score += 2 // Boost featured businesses
          score += business.rating // Add rating boost

          return { term: business.name, score }
        }

        return null
      })

      const businessResults = await Promise.all(businessPromises)

      // Perbaikan dengan type predicate
      const filteredResults = businessResults.filter((result): result is { term: string; score: number } => result !== null)

      suggestions.push(...filteredResults)
    } catch (error) {
      console.error('Error getting business name suggestions:', error)
    }

    return suggestions
  }

  private tokenizeQuery(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((term) => term.length > 1) // Reduced from 2 to 1 for better suggestions
  }

  private calculateRelevanceScore(business: Business, searchTerms: string[]): number {
    let score = 0
    const businessText = `${business.name} ${business.description || ''} ${(business.keywords || []).join(' ')}`.toLowerCase()

    for (const term of searchTerms) {
      // Exact match in name (highest score)
      if (business.name.toLowerCase().includes(term)) {
        score += 10
        // Bonus for exact word match
        if (business.name.toLowerCase().split(' ').includes(term)) {
          score += 5
        }
        // Bonus for prefix match
        if (business.name.toLowerCase().startsWith(term)) {
          score += 7
        }
      }

      // Match in description
      if (business.description && business.description.toLowerCase().includes(term)) {
        score += 5
      }

      // Match in keywords
      if (business.keywords && business.keywords.some((keyword) => keyword.toLowerCase().includes(term))) {
        score += 7
      }

      // Partial matches
      const termMatches = (businessText.match(new RegExp(term, 'g')) || []).length
      score += termMatches * 2
    }

    // Boost featured businesses
    if (business.featured) {
      score += 5
    }

    // Boost businesses with higher ratings
    score += business.rating

    return score
  }
}
