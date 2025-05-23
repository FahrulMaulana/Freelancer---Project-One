import { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger'

export class SwaggerApiDocs extends DocumentBuilder {
  app: NestExpressApplication
  config: Omit<OpenAPIObject, 'paths'>
  constructor(app: NestExpressApplication) {
    super()
    this.app = app
    const config = super.setTitle('API Documentation').setVersion('1.0').addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
      },
      'access-token' // Ini adalah nama yang akan digunakan untuk referensi di decorator
    )
    this.config = config.build()
  }

  createDoc() {
    return SwaggerModule.createDocument(this.app, this.config, {
      // include: [HelloController],
      operationIdFactory: (controller, method) => method,
    })
  }

  init() {
    SwaggerModule.setup('/api-docs', this.app, this.createDoc(), {
      swaggerOptions: {
        persistAuthorization: true,
        defaultModelsExpandDepth: 0,
        securityDefinitions: {
          bearerAuth: {
            type: 'apiKey',
            name: 'Authorization',
            scheme: 'bearer',
            in: 'header',
          },
        },
      },
    })
  }
}
