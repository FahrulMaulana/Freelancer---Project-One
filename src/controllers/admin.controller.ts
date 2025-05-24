import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AdminGuard } from 'src/guards/admin.guard'
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard'
import { AdminService } from 'src/services/admin.service'

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getDashboard() {
    return this.adminService.getDashboardStats()
  }

  @Get('health')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getSystemHealth() {
    return this.adminService.getSystemHealth()
  }
}
