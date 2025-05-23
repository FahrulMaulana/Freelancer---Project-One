export interface BusinessHours {
  [day: string]: {
    open: string
    close: string
  }
}

export interface Business {
  id: string
  name: string
  description?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  socialMedia?: Record<string, string>
  latitude?: number
  longitude?: number
  images?: string[]
  keywords?: string[]
  featured: boolean
  active: boolean
  rating: number
  reviewCount: number
  businessHours?: BusinessHours
  categoryId: string
  subcategoryId: string
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  icon?: string
  active: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface Subcategory {
  id: string
  name: string
  slug: string
  description?: string
  active: boolean
  sortOrder: number
  categoryId: string
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  username: string
  email: string
  password: string
  favorites: string[]
  createdAt: string
  updatedAt: string
}

export interface Admin {
  id: string
  username: string
  email: string
  password: string
  role: string
  createdAt: string
  updatedAt: string
}
