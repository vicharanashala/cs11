import { Injectable, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { UsersService } from '../users/users.service'
import { ROLES } from '../config/roles'

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const name = this.configService.get<string>('SUPERADMIN_NAME')
    const email = this.configService.get<string>('SUPERADMIN_EMAIL')
    const password = this.configService.get<string>('SUPERADMIN_PASSWORD')

    if (!name || !email || !password) {
      return // Not configured — skip bootstrap silently
    }

    const existing = await this.usersService.findByEmail(email)
    if (existing) return // Already seeded

    await this.usersService.create({ name, email, password, role: ROLES.SUPERADMIN })
    console.log(`✅ Bootstrap superadmin created: ${email}`)
  }
}