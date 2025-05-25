import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule, JwtService } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { ServeStaticModule } from '@nestjs/serve-static'
import { ThrottlerModule } from '@nestjs/throttler'
import { join } from 'path'
import { AuthController } from './auth/auth.controller'
import { AuthService } from './auth/auth.service'
import { JwtStrategy } from './auth/strategies/jwt.strategy'
import { LocalStrategy } from './auth/strategies/local.strategy'
import { AdminController } from './controllers/admin.controller'
import { BusinessController } from './controllers/business.controller'
import { CategoryController } from './controllers/category.controller'
import { fileController } from './controllers/file.controller'
import { HealthController } from './controllers/health.controller'
import { SearchController } from './controllers/search.controller'
import { UserController } from './controllers/user.controller'
import { AdminService } from './services/admin.service'
import { BusinessService } from './services/business.service'
import { CategoryService } from './services/category.service'
import { fileService } from './services/file.service'
import { HealthService } from './services/health.service'
import { RedisModule } from './services/redis.module'
import { SearchService } from './services/search.service'
import { UserService } from './services/user.service'

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/', // Serve di root path
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN', '24h'),
        },
      }),
      inject: [ConfigService],
    }),
    RedisModule,
  ],
  controllers: [
    AuthController,
    UserController,
    AdminController,
    HealthController,
    BusinessController,
    SearchController,
    CategoryController,
    fileController,
  ],
  providers: [
    JwtStrategy,
    LocalStrategy,
    AuthService,
    JwtService,
    SearchService,
    UserService,
    AdminService,
    HealthService,
    BusinessService,
    CategoryService,
    fileService,
  ],
})
export class AppModule {}
