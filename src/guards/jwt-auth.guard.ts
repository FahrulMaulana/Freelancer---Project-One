import { ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Observable } from 'rxjs'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private logger = new Logger(JwtAuthGuard.name)

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Tambahkan logging untuk memantau permintaan yang masuk
    const req = context.switchToHttp().getRequest()
    this.logger.debug(`Incoming request to protected route: ${req.url}`)

    // Periksa header Authorization
    if (!req.headers.authorization) {
      this.logger.error('Authorization header missing')
      throw new UnauthorizedException('Authorization header tidak ditemukan')
    }

    // Periksa format Bearer token
    if (!req.headers.authorization.startsWith('Bearer ')) {
      this.logger.error('Invalid Authorization header format - Bearer prefix missing')
      throw new UnauthorizedException('Format token tidak valid - awalan Bearer diperlukan')
    }

    return super.canActivate(context)
  }

  handleRequest(err, user, info, context) {
    const req = context.switchToHttp().getRequest()

    if (err) {
      this.logger.error(`Auth error: ${err.message}`)
      throw err
    }

    if (!user) {
      if (info) {
        this.logger.error(`Auth failed: ${info.message}`)
        throw new UnauthorizedException(info.message)
      } else {
        this.logger.error('User tidak ditemukan dari token')
        throw new UnauthorizedException('Token tidak valid atau kedaluwarsa')
      }
    }

    this.logger.debug(`User authenticated: ${user.id}`)
    return user
  }
}
