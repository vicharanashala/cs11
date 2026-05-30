import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import request = require('supertest')
import { AppModule } from '../src/app.module'
import { GlobalHttpExceptionFilter } from '../src/common/http-exception.filter'
import { UsersService } from '../src/users/users.service'
import { ROLES } from '../src/config/roles'

/**
 * Admin e2e test.
 *
 * Scenarios:
 * 1. Admin resolution flow — admin logs in → fetches unresolved queries →
 *    resolves one → question becomes 'resolved' → disappears from queue.
 * 2. Promote to FAQ flow — admin promotes a resolved question →
 *    new FAQ is created → question is closed.
 * 3. Rebuild-index returns rebuilt=false when AI service is unreachable.
 */
describe('Admin (e2e)', () => {
  let app: INestApplication
  let adminToken: string
  let studentToken: string
  let questionId: string
  let answerId: string
  let studentId: string

  const adminEmail = `admin_e2e${Date.now()}@test.com`
  const studentEmail = `student_admin${Date.now()}@test.com`

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    app.useGlobalFilters(new GlobalHttpExceptionFilter())
    await app.init()

    // Create an admin user directly via UsersService (bypasses the register
    // endpoint which always creates intern-role users)
    const usersService = app.get<UsersService>(UsersService)

    // Use password (not passwordHash) — UsersService.create hashes it internally
    const admin = await usersService.create({
      name: 'Admin E2E',
      email: adminEmail,
      password: 'Test@1234',
      role: ROLES.SUPERADMIN,
    })

    const student = await usersService.create({
      name: 'Student E2E',
      email: studentEmail,
      password: 'Test@1234',
      role: ROLES.INTERN,
    })
    studentId = (student as any)._id.toString()

    // Login both users
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password: 'Test@1234' })
    adminToken = adminLogin.body.accessToken

    const studentLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: studentEmail, password: 'Test@1234' })
    studentToken = studentLogin.body.accessToken

    // Student creates a question
    const qRes = await request(app.getHttpServer())
      .post('/api/questions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'What are the library opening hours?',
        body: 'I need to study late tonight.',
        tags: ['library', 'hours'],
      })
    questionId = qRes.body.questionId

    // Student posts an answer
    const answerPostRes = await request(app.getHttpServer())
      .post(`/api/questions/${questionId}/answers`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ body: 'The library is open until 11 PM on weekdays.' })
    answerId = answerPostRes.body._id
  })

  afterAll(async () => {
    await app.close()
  })

  // ── Admin guard tests ──────────────────────────────────────────────────────

  it('regular user cannot access admin endpoints (403)', async () => {
    const res1 = await request(app.getHttpServer())
      .get('/api/admin/queries')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(403)
    expect(res1.body.statusCode).toBe(403)

    const res2 = await request(app.getHttpServer())
      .post('/api/admin/rebuild-index')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(403)
    expect(res2.body.statusCode).toBe(403)

    const res3 = await request(app.getHttpServer())
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(403)
    expect(res3.body.statusCode).toBe(403)
  })

  // ── Resolution queue ────────────────────────────────────────────────────────

  it('admin fetches unresolved query queue and sees the open question', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/queries')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    expect(res.body).toMatchObject({
      data: expect.any(Array),
      totalCount: expect.any(Number),
      page: expect.any(Number),
    })

    const found = res.body.data.some(
      (item: any) => item.questionId === questionId,
    )
    expect(found).toBe(true)
  })

  it('admin resolves a question → returns questionId + answerId', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/admin/queries/${questionId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ responseBody: 'Mon–Fri 8 AM – 11 PM, Sat 9 AM – 6 PM.' })
      .expect(200)

    expect(res.body).toMatchObject({
      questionId,
      answerId: expect.any(String),
    })
  })

  it('after resolution, question status is resolved', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/questions/${questionId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    expect(res.body.status).toBe('resolved')
  })

  it('resolved question no longer appears in unresolved query queue', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/queries')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    const found = res.body.data.some(
      (item: any) => item.questionId === questionId,
    )
    expect(found).toBe(false)
  })

  // ── Promote to FAQ ──────────────────────────────────────────────────────────

  it('promote to FAQ: admin promotes resolved question → 201, question becomes closed', async () => {
    await request(app.getHttpServer())
      .post(`/api/questions/${questionId}/answers/promote-faq`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        answerId,
        title: 'Library Opening Hours FAQ',
        category: '000000000000000000000000',
        tags: ['library', 'hours'],
      })
      .expect(201)

    // Verify question is closed
    const qRes = await request(app.getHttpServer())
      .get(`/api/questions/${questionId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    expect(qRes.body.status).toBe('closed')
  })

  // ── Analytics ───────────────────────────────────────────────────────────────

  it('admin can fetch analytics dashboard', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    expect(res.body).toMatchObject({
      totalFaqs: expect.any(Number),
      totalQuestions: expect.objectContaining({
        open: expect.any(Number),
        in_progress: expect.any(Number),
        resolved: expect.any(Number),
        closed: expect.any(Number),
      }),
      totalAnswers: expect.any(Number),
      aiMatchRate: expect.any(Number),
    })
  })

  // ── Rebuild index ───────────────────────────────────────────────────────────

  it('rebuild-index returns rebuilt=false when AI service is unreachable (expected in test env)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/admin/rebuild-index')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201)

    expect(res.body).toMatchObject({
      rebuilt: false,
      count: expect.any(Number),
    })
  })
})