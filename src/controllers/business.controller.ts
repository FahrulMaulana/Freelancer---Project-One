import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { BulkCreateBusinessDto } from 'src/dto/bulk-create-business.dto'
import { BusinessQueryDto } from 'src/dto/business-query.dto'
import { CreateBusinessDto } from 'src/dto/create-business.dto'
import { UpdateBusinessDto } from 'src/dto/update-business.dto'
import { AdminGuard } from 'src/guards/admin.guard'
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard'
import { BusinessService } from 'src/services/business.service'

@ApiTags('Businesses')
@Controller('businesses')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  create(@Body() createBusinessDto: CreateBusinessDto) {
    return this.businessService.create(createBusinessDto)
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  bulkCreate(@Body() bulkCreateBusinessDto: BulkCreateBusinessDto) {
    return this.businessService.bulkCreate(bulkCreateBusinessDto)
  }

  @Get()
  findAll(@Query() query: BusinessQueryDto) {
    return this.businessService.findAll(query)
  }

  @Get('stats')
  getStats() {
    return this.businessService.getStats()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.businessService.findOne(id)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  update(@Param('id') id: string, @Body() updateBusinessDto: UpdateBusinessDto) {
    return this.businessService.update(id, updateBusinessDto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.businessService.remove(id)
  }
}
