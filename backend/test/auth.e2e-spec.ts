import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import request = require('supertest')
import { AppModule } from '../src/app.module'
import { GlobalHttpExceptionFilter } from '../src/common/http-exception.filter'
import { Types } from 'mongoose'

describe('Auth (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    app.useGlobalFilters(new GlobalHttpExceptionFilter())
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  // ── Helpers ────────────────────────────────────────────────────────────────

  const studentA = { name: 'Studenta', email: `studenta${Date.now()}@test.com`, password: 'Test@1234' }
  const studentB = { name: 'Studentb', email: `studentb${Date.now()}@test.com`, password: 'Test@1234' }

  async function register(body: { name: string; email: string; password: string }) {
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .send(body)
      .expect(201)
  }

  async function login(email: string, password: string) {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200)
  }

  async function me(token: string) {
    return request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
  }

  async function getProtected(token: string) {
    return request(app.getHttpServer())
      .get('/api/questions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
  }

  // ── Tests ─────────────────────────────────────────────────────────────────

  it('should reject registration with missing fields', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Test' })
      .expect(400)

    // Exception filter should return our shape
    expect(res.body).toMatchObject({
      statusCode: 400,
      timestamp: expect.any(String),
      path: '/api/auth/register',
    })
    expect(Array.isArray(res.body.message) || typeof res.body.message === 'string').toBe(true)
  })

  it('should reject login with wrong credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'wrong' })
      .expect(401)

    expect(res.body).toMatchObject({
      statusCode: 401,
      message: 'Invalid credentials',
    })
  })

  it('signup → login → get token → access protected route', async () => {
    // 1. Signup
    const signupRes = await register(studentA)
    expect(signupRes.body).toMatchObject({
      userId: expect.any(String),
      name: studentA.name,
      email: studentA.email,
      role: 'intern',
    })
    const userId: string = signupRes.body.userId

    // 2. Login
    const loginRes = await login(studentA.email, studentA.password)
    expect(loginRes.body).toMatchObject({
      accessToken: expect.any(String),
      user: {
        userId,
        name: studentA.name,
        email: studentA.email,
        role: 'intern',
      },
    })
    const token: string = loginRes.body.accessToken

    // 3. /auth/me — validate token
    const meRes = await me(token)
    expect(meRes.body).toMatchObject({
      userId,
      name: studentA.name,
      email: studentA.email,
      role: 'intern',
    })

    // 4. Access protected questions endpoint
    await getProtected(token)

    // 5. Reject request with no token
    await request(app.getHttpServer())
      .get('/api/questions')
      .expect(401)
  })

  it('should not allow duplicate email registration', async () => {
    await register(studentB)
    const duplicateRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(studentB)
    expect(duplicateRes.status).toBe(409)
    expect(duplicateRes.body.statusCode).toBe(409)
  })

  it('internal server error stays hidden from clients', async () => {
    // Hit an endpoint with a completely malformed MongoDB ObjectId to trigger
    // an internal path — the filter ensures no stack trace leaks
    const res = await request(app.getHttpServer())
      .get('/api/questions/invalid-id-format')
      .set('Authorization', `Bearer ${(await login(studentA.email, studentA.password)).body.accessToken}`)
      .expect(404)

    // Must never expose 'stack', 'errors', or raw Error objects
    expect(Object.keys(res.body)).not.toContain('stack')
    expect(Object.keys(res.body)).not.toContain('errors')
  })
})