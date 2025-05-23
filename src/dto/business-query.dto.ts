import { Transform } from 'class-transformer'
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'

export class BusinessQueryDto {
  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @IsString()
  subcategory?: string

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  featured?: boolean

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  active?: boolean

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
  @IsIn(['name', 'createdAt', 'updatedAt', 'rating'])
  sortBy?: string = 'createdAt'

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC'
}
