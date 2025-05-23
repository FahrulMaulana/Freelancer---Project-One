import { Type } from 'class-transformer'
import { IsArray, ValidateNested } from 'class-validator'
import { CreateBusinessDto } from './create-business.dto'

export class BulkCreateBusinessDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBusinessDto)
  businesses: CreateBusinessDto[]
}
