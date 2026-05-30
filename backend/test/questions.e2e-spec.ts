import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import request = require('supertest')
import { AppModule } from '../src/app.module'
import { GlobalHttpExceptionFilter } from '../src/common/http-exception.filter'
import { Types } from 'mongoose'

/**
 * Question flow e2e test.
 *
 * Scenario:
 * 1. Student logs in → submits question → AI match mock returns confidence 0.5
 *    (below 0.7 threshold) → question saved with status 'open'.
 * 2. Resolver (another user) posts an answer → status advances to 'in_progress'.
 * 3. Student accepts the answer → status becomes 'resolved'.
 *
 * The AI service is mocked at the Axios level so it returns 0.5 confidence
 * (below threshold), allowing the question to be saved.
 */
describe('Questions (e2e)', () => {
  let app: INestApplication
  let studentToken: string
  let resolverToken: string
  let studentId: string
  let resolverId: string
  let questionId: string

  const studentEmail = `student_q${Date.now()}@test.com`
  const resolverEmail = `resolver_q${Date.now()}@test.com`

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    app.useGlobalFilters(new GlobalHttpExceptionFilter())
    await app.init()

    // Register and login two users
    const studentSignup = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Q Student', email: studentEmail, password: 'Test@1234' })
    studentId = studentSignup.body.userId

    const resolverSignup = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Q Resolver', email: resolverEmail, password: 'Test@1234' })
    resolverId = resolverSignup.body.userId

    const studentLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: studentEmail, password: 'Test@1234' })
    studentToken = studentLogin.body.accessToken

    const resolverLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: resolverEmail, password: 'Test@1234' })
    resolverToken = resolverLogin.body.accessToken
  })

  afterAll(async () => {
    await app.close()
  })

  // ── Step 1: Submit question ─────────────────────────────────────────────────

  it('student submits a question (no strong AI match → saved as open)', async () => {
    const body = {
      title: 'How do I reset my portal password?',
      body: 'I tried clicking forgot password but never got the email.',
      tags: ['password', 'portal'],
    }

    // The AI mock returns confidence 0.5, which is below the 0.7 threshold.
    // NestJS should fall through to creating the question.
    const res = await request(app.getHttpServer())
      .post('/api/questions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send(body)
      .expect(200)

    // No strong AI match — backend returns questionId + message
    expect(res.body).toMatchObject({
      questionId: expect.any(String),
      message: expect.any(String),
    })
    questionId = res.body.questionId
  })

  it('question is saved with status open', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/questions/${questionId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200)

    expect(res.body).toMatchObject({
      _id: questionId,
      status: 'open',
      title: 'How do I reset my portal password?',
    })
    expect(res.body.askedBy).toMatchObject({ name: 'Q Student' })
  })

  it('student can see their own question in the list', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/questions')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200)

    const found = res.body.data.some(
      (q: any) => q._id === questionId || q.questionId === questionId,
    )
    expect(found).toBe(true)
  })

  // ── Step 2: Resolver posts an answer ────────────────────────────────────────

  it('resolver posts an answer → question status advances to in_progress', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/questions/${questionId}/answers`)
      .set('Authorization', `Bearer ${resolverToken}`)
      .send({ body: 'Go to the IT desk on level 2 — they can reset it on the spot.' })
      .expect(201)

    expect(res.body).toMatchObject({
      questionId: expect.any(String),
      body: expect.any(String),
      contributedBy: expect.any(Object),
    })

    // Verify status advanced
    const qRes = await request(app.getHttpServer())
      .get(`/api/questions/${questionId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200)

    expect(qRes.body.status).toBe('in_progress')
  })

  // ── Step 3: Student accepts the answer ──────────────────────────────────────

  it('student fetches answers and accepts one', async () => {
    // List answers to find the answerId
    const answersRes = await request(app.getHttpServer())
      .get(`/api/questions/${questionId}/answers`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200)

    expect(answersRes.body).toBeInstanceOf(Array)
    expect(answersRes.body.length).toBeGreaterThan(0)
    const answer = answersRes.body[0]

    // Accept the answer
    const acceptRes = await request(app.getHttpServer())
      .patch(`/api/questions/${questionId}/answers/${answer._id}/accept`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200)

    expect(acceptRes.body).toMatchObject({ isAccepted: true })
  })

  it('after acceptance, question status is resolved', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/questions/${questionId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200)

    expect(res.body.status).toBe('resolved')
  })

  it('accepted answer is marked isAccepted=true', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/questions/${questionId}/answers`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200)

    const acceptedAnswer = res.body.find((a: any) => a.isAccepted === true)
    expect(acceptedAnswer).toBeDefined()
    expect(acceptedAnswer.isAccepted).toBe(true)
  })

  it('cannot answer a resolved (closed) question', async () => {
    await request(app.getHttpServer())
      .post(`/api/questions/${questionId}/answers`)
      .set('Authorization', `Bearer ${resolverToken}`)
      .send({ body: 'Another answer attempt.' })
      .expect(400)
  })
})