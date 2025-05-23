/**
 * Represents a subcategory
 */
export interface Subcategory {
  id: string
  name?: string
  description?: string
  icon?: string
}

/**
 * Interface representing a category in the system
 */
export interface Category {
  id: string
  name?: string
  description?: string
  icon?: string
  slug?: string
  count?: number // Jumlah bisnis dalam kategori ini
  businessCount?: number // Alternatif nama untuk jumlah bisnis
  subcategories?: Subcategory[] // Array subcategories
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Interface for the Category document when using MongoDB/Mongoose
 */
