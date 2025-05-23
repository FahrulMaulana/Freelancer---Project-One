import { Controller, Get } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { HealthService } from 'src/services/health.service'

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check() {
    return this.healthService.check()
  }

  @Get('ready')
  ready() {
    return this.healthService.ready()
  }

  @Get('live')
  live() {
    return this.healthService.live()
  }
}
