import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { AppModule } from '../app.module'
import { UsersService } from '../users/users.service'
import { ROLES } from '../config/roles'

/**
 * Bootstrap seed script — creates the initial superadmin if none exists.
 * Run with: npm run seed
 *
 * Required environment variables:
 *   SUPERADMIN_NAME
 *   SUPERADMIN_EMAIL
 *   SUPERADMIN_PASSWORD
 *
 * The script is idempotent — running it multiple times is safe.
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule)

  const configService = app.get(ConfigService)
  const usersService = app.get(UsersService)

  const name = configService.get<string>('SUPERADMIN_NAME')
  const email = configService.get<string>('SUPERADMIN_EMAIL')
  const password = configService.get<string>('SUPERADMIN_PASSWORD')

  if (!name || !email || !password) {
    console.error(
      'Seed aborted: SUPERADMIN_NAME, SUPERADMIN_EMAIL, and SUPERADMIN_PASSWORD must all be set in .env',
    )
    process.exit(1)
  }

  const existing = await usersService.findByEmail(email)
  if (existing) {
    console.log(`Superadmin ${email} already exists — seed skipped (idempotent).`)
    await app.close()
    return
  }

  await usersService.create({
    name,
    email,
    password,
    role: ROLES.SUPERADMIN,
  })

  console.log(`✅ Superadmin created: ${email}`)
  await app.close()
}

bootstrap()