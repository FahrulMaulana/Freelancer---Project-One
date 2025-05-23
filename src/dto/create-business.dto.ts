import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'

export class BusinessHoursDto {
  @IsString()
  open: string

  @IsString()
  close: string
}

export class CreateBusinessDto {
  @IsString()
  @MaxLength(255)
  name: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsUrl()
  website?: string

  @IsOptional()
  @IsObject()
  socialMedia?: Record<string, string>

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[]

  @IsOptional()
  @IsBoolean()
  featured?: boolean = false

  @IsOptional()
  @IsBoolean()
  active?: boolean = true

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number = 0

  @IsOptional()
  @IsNumber()
  @Min(0)
  reviewCount?: number = 0

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BusinessHoursDto)
  businessHours?: Record<string, BusinessHoursDto>

  @IsUUID()
  categoryId: string

  @IsUUID()
  subcategoryId: string
}
