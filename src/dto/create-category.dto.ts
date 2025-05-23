import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class CreateCategoryDto {
  @IsString()
  @MaxLength(100)
  name: string

  @IsString()
  @MaxLength(100)
  slug: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  icon?: string

  @IsOptional()
  @IsBoolean()
  active?: boolean = true

  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number = 0
}
