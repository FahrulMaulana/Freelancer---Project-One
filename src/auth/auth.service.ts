import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { AdminRegisterDto } from 'src/dto/admin-register.dto'
import { RegisterDto } from 'src/dto/register.dto'
import { RedisService } from 'src/services/redis.service'
import { v4 as uuidv4 } from 'uuid'
import { Admin, User } from '../common/interfaces/business.interface'

@Injectable()
export class AuthService {
  private readonly USER_KEY = 'user'
  private readonly ADMIN_KEY = 'admin'
  private readonly USER_LIST_KEY = 'users:list'
  private readonly ADMIN_LIST_KEY = 'admins:list'

  constructor(private redisService: RedisService, private jwtService: JwtService, private readonly configService: ConfigService) {
    // Verify JWT_SECRET is set at startup
    const jwtSecret = this.configService.get<string>('JWT_SECRET')
    if (!jwtSecret) {
      throw new BadRequestException('JWT_SECRET environment variable is not set!')
    }
  }

  async register(registerDto: RegisterDto): Promise<{ user: Omit<User, 'password'>; token: string }> {
    // Check if username exists
    const existingUser = await this.findUserByUsername(registerDto.username)
    if (existingUser) {
      throw new BadRequestException('Username already exists')
    }

    // Check if email exists
    const existingEmail = await this.findUserByEmail(registerDto.email)
    if (existingEmail) {
      throw new BadRequestException('Email already exists')
    }

    const userId = uuidv4()
    const hashedPassword = await bcrypt.hash(registerDto.password, 10)
    const now = new Date().toISOString()

    const user: User = {
      id: userId,
      username: registerDto.username,
      email: registerDto.email,
      password: hashedPassword,
      favorites: [],
      createdAt: now,
      updatedAt: now,
    }

    // Save user
    await this.redisService.hset(`${this.USER_KEY}:${userId}`, 'data', JSON.stringify(user))
    await this.redisService.sadd(this.USER_LIST_KEY, userId)

    // Create indexes
    await this.redisService.set(`user:username:${user.username}`, userId)
    await this.redisService.set(`user:email:${user.email}`, userId)

    // Generate token
    const token = this.generateToken(userId, 'user')

    const { password, ...userWithoutPassword } = user
    return { user: userWithoutPassword, token }
  }

  async registerAdmin(adminRegisterDto: AdminRegisterDto): Promise<{ admin: Omit<Admin, 'password'>; token: string }> {
    // Check if username exists
    const existingAdmin = await this.findAdminByUsername(adminRegisterDto.username)
    if (existingAdmin) {
      throw new BadRequestException('Admin username already exists')
    }

    // Check if email exists
    const existingEmail = await this.findAdminByEmail(adminRegisterDto.email)
    if (existingEmail) {
      throw new BadRequestException('Admin email already exists')
    }

    const adminId = uuidv4()
    const hashedPassword = await bcrypt.hash(adminRegisterDto.password, 10)
    const now = new Date().toISOString()

    const admin: Admin = {
      id: adminId,
      username: adminRegisterDto.username,
      email: adminRegisterDto.email,
      password: hashedPassword,
      role: adminRegisterDto.role,
      createdAt: now,
      updatedAt: now,
    }

    // Save admin
    await this.redisService.hset(`${this.ADMIN_KEY}:${adminId}`, 'data', JSON.stringify(admin))
    await this.redisService.sadd(this.ADMIN_LIST_KEY, adminId)

    // Create indexes
    await this.redisService.set(`admin:username:${admin.username}`, adminId)
    await this.redisService.set(`admin:email:${admin.email}`, adminId)

    // Generate token
    const token = this.generateToken(adminId, 'admin')

    const { password, ...adminWithoutPassword } = admin
    return { admin: adminWithoutPassword, token }
  }

  async login(username: string, password: string, type: 'user' | 'admin' = 'user'): Promise<{ user: any; token: string }> {
    const user = await this.validateUser(username, password, type)
    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const token = this.generateToken(user.id, type)
    const { password: _, ...userWithoutPassword } = user

    return { user: userWithoutPassword, token }
  }

  async validateUser(username: string, password: string, type: 'user' | 'admin' = 'user'): Promise<User | Admin | null> {
    let user: User | Admin | null

    if (type === 'admin') {
      user = await this.findAdminByUsername(username)
    } else {
      user = await this.findUserByUsername(username)
    }

    if (user && (await bcrypt.compare(password, user.password))) {
      return user
    }

    return null
  }

  async validateUserById(id: string, type: 'user' | 'admin'): Promise<User | Admin | null> {
    if (type === 'admin') {
      return this.findAdminById(id)
    } else {
      return this.findUserById(id)
    }
  }

  private async findUserByUsername(username: string): Promise<User | null> {
    const userId = await this.redisService.get(`user:username:${username}`)
    if (!userId) return null
    return this.findUserById(userId)
  }

  private async findUserByEmail(email: string): Promise<User | null> {
    const userId = await this.redisService.get(`user:email:${email}`)
    if (!userId) return null
    return this.findUserById(userId)
  }

  private async findUserById(id: string): Promise<User | null> {
    const userData = await this.redisService.hget(`${this.USER_KEY}:${id}`, 'data')
    return userData ? JSON.parse(userData) : null
  }

  private async findAdminByUsername(username: string): Promise<Admin | null> {
    const adminId = await this.redisService.get(`admin:username:${username}`)
    if (!adminId) return null
    return this.findAdminById(adminId)
  }

  private async findAdminByEmail(email: string): Promise<Admin | null> {
    const adminId = await this.redisService.get(`admin:email:${email}`)
    if (!adminId) return null
    return this.findAdminById(adminId)
  }

  private async findAdminById(id: string): Promise<Admin | null> {
    const adminData = await this.redisService.hget(`${this.ADMIN_KEY}:${id}`, 'data')
    return adminData ? JSON.parse(adminData) : null
  }

  // private generateToken(id: string, type: 'user' | 'admin'): string {
  //   const payload = { sub: id, type }
  //   return this.jwtService.sign(payload)
  // }

  private generateToken(id: string, type: 'user' | 'admin'): string {
    const payload = { sub: id, type }
    const secret = this.configService.get<string>('JWT_SECRET')

    // Log the secret for debugging (remove in production)
    console.log('JWT Secret:', secret)

    // Explicitly pass the secret in the sign options
    return this.jwtService.sign(payload, { secret })
  }
}
