import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import * as compression from 'compression'
import helmet from 'helmet'
import { join } from 'path'
import { env } from 'process'
import { AppModule } from './app.module'
import { SwaggerApiDocs } from './docs/swagger-api.docs'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  // // Static Assets
  app.useStaticAssets(join(__dirname, '..', 'public'))

  // Security
  app.use(helmet())
  app.use(compression())

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  )

  // Global prefix
  app.setGlobalPrefix('api')

  // Graceful shutdown
  app.enableShutdownHooks()

  app.enableCors({
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
  })

  /* Swagger */
  if (env.APP_ENV !== 'prod') {
    new SwaggerApiDocs(app).init()
  }

  await app.listen(3000)

  console.log(`Application is running on: http://localhost:3000`)
}
bootstrap()
