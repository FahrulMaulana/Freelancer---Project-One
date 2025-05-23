import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'
import { CreateBusinessDto } from './create-business.dto'
import { CreateCategoryDto } from './create-category.dto'

export class SearchQueryDto {
  @IsString()
  q: string

  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @IsString()
  subcategory?: string

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(0)
  offset?: number = 0

  @IsOptional()
  @IsIn(['relevance', 'name', 'rating', 'createdAt'])
  sortBy?: string = 'relevance'
}

// Di search-result.dto.ts
export class SearchResultDto {
  @ApiProperty({ type: [CreateBusinessDto] })
  data: CreateBusinessDto[]

  @ApiProperty({ type: [CreateBusinessDto] })
  categories: CreateCategoryDto[]

  @ApiProperty()
  total: number

  @ApiProperty()
  page: number

  @ApiProperty()
  limit: number

  @ApiProperty()
  query: string
}
