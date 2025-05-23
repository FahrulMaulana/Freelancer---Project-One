// src/search/search.controller.ts
import { Controller, Get, Query } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { SearchQueryDto } from 'src/dto/search-query.dto'
import { SearchService } from 'src/services/search.service'

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@Query() searchQuery: SearchQueryDto) {
    return this.searchService.search(searchQuery)
  }

  @Get('suggestions')
  getSuggestions(@Query('q') query: string) {
    return this.searchService.getSuggestions(query)
  }
}
