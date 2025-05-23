import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { CreateCategoryDto } from 'src/dto/create-category.dto'
import { CreateSubcategoryDto } from 'src/dto/create-subcategory.dto'
import { UpdateCategoryDto } from 'src/dto/update-category.dto'
import { UpdateSubcategoryDto } from 'src/dto/update-subcategory.dto'
import { AdminGuard } from 'src/guards/admin.guard'
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard'
import { CategoryService } from 'src/services/category.service'

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  // Category endpoints
  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.createCategory(createCategoryDto)
  }

  @Get()
  findAllCategories() {
    return this.categoryService.getCategoriesWithSubcategories()
  }

  @Get('simple')
  findCategories() {
    return this.categoryService.findAllCategories()
  }

  @Get(':id')
  findCategory(@Param('id') id: string) {
    return this.categoryService.findCategoryById(id)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  updateCategory(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoryService.updateCategory(id, updateCategoryDto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeCategory(@Param('id') id: string) {
    return this.categoryService.removeCategory(id)
  }

  // Subcategory endpoints
  @Post('subcategories')
  @UseGuards(JwtAuthGuard, AdminGuard)
  createSubcategory(@Body() createSubcategoryDto: CreateSubcategoryDto) {
    return this.categoryService.createSubcategory(createSubcategoryDto)
  }

  @Get('subcategories/all')
  findAllSubcategories() {
    return this.categoryService.findAllSubcategories()
  }

  @Get(':categoryId/subcategories')
  findSubcategoriesByCategory(@Param('categoryId') categoryId: string) {
    return this.categoryService.findSubcategoriesByCategory(categoryId)
  }

  @Get('subcategories/:id')
  findSubcategory(@Param('id') id: string) {
    return this.categoryService.findSubcategoryById(id)
  }

  @Patch('subcategories/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  updateSubcategory(@Param('id') id: string, @Body() updateSubcategoryDto: UpdateSubcategoryDto) {
    return this.categoryService.updateSubcategory(id, updateSubcategoryDto)
  }

  @Delete('subcategories/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeSubcategory(@Param('id') id: string) {
    return this.categoryService.removeSubcategory(id)
  }
}
