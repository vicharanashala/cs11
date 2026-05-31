import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { UsersService } from '../users/users.service'
import { RegisterDto, LoginDto } from './dto'
import { ROLES } from '../config/roles'

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email)
    if (existing) {
      throw new ConflictException('Email already in use')
    }

    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      role: ROLES.INTERN,
    })

    const token = this.generateToken(user._id.toString(), user.email, user.role, user.isFirstTimeIntern ?? true)
    const { passwordHash, ...userWithoutPassword } = user.toObject()
    return { token, user: userWithoutPassword }
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email)
    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const valid = await this.usersService.validatePassword(user, dto.password)
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const token = this.generateToken(user._id.toString(), user.email, user.role, user.isFirstTimeIntern ?? true)
    const { passwordHash, ...userWithoutPassword } = user.toObject()
    return { token, user: userWithoutPassword }
  }

  private generateToken(userId: string, email: string, role: string, isFirstTimeIntern: boolean) {
    return this.jwtService.sign({ userId, email, role, isFirstTimeIntern })
  }

  clearFirstTimeFlag(userId: string) {
    return this.usersService.updateField(userId, 'isFirstTimeIntern', false)
  }
}