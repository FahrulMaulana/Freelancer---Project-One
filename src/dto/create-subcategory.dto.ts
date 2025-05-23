import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator'

export class CreateSubcategoryDto {
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
  @IsBoolean()
  active?: boolean = true

  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number = 0

  @IsUUID()
  categoryId: string
}
