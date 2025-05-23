import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Request, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { AddFavoriteDto } from 'src/dto/add-favorite.dto'
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard'
import { UserService } from 'src/services/user.service'

@ApiTags('User')
@ApiBearerAuth('access-token')
@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  getProfile(@Request() req) {
    return this.userService.getUserProfile(req.user.id)
  }

  @Get('favorites')
  getFavorites(@Request() req) {
    return this.userService.getFavorites(req.user.id)
  }

  @Post('favorites')
  @HttpCode(HttpStatus.CREATED)
  addFavorite(@Request() req, @Body() addFavoriteDto: AddFavoriteDto) {
    return this.userService.addFavorite(req.user.id, addFavoriteDto)
  }

  @Delete('favorites/:businessId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeFavorite(@Request() req, @Param('businessId') businessId: string) {
    return this.userService.removeFavorite(req.user.id, businessId)
  }
}
