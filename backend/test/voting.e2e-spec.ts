import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import request = require('supertest')
import { AppModule } from '../src/app.module'
import { GlobalHttpExceptionFilter } from '../src/common/http-exception.filter'

/**
 * Voting e2e test.
 *
 * Scenario:
 * 1. UserA and UserB register and log in.
 * 2. UserA posts an answer to a question.
 * 3. UserB upvotes → count increments.
 * 4. UserB upvotes again → vote toggled off → count decrements back.
 * 5. UserB downvotes → count reflects the new downvotes.
 */
describe('Voting (e2e)', () => {
  let app: INestApplication
  let userAToken: string
  let userBToken: string
  let questionId: string
  let answerId: string

  const userAEmail = `votera${Date.now()}@test.com`
  const userBEmail = `voterb${Date.now()}@test.com`

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    app.useGlobalFilters(new GlobalHttpExceptionFilter())
    await app.init()

    // Register + login both users
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Voter A', email: userAEmail, password: 'Test@1234' })

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Voter B', email: userBEmail, password: 'Test@1234' })

    userAToken = (await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: userAEmail, password: 'Test@1234' })).body.accessToken

    userBToken = (await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: userBEmail, password: 'Test@1234' })).body.accessToken

    // Create a question (User A)
    const qRes = await request(app.getHttpServer())
      .post('/api/questions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Where is the campus library?',
        body: 'I cannot find it on the map.',
        tags: ['library', 'campus'],
      })
    questionId = qRes.body.questionId

    // Post an answer (User A — answering own question is allowed;
    // the vote guard only prevents voting on own answers)
    const aRes = await request(app.getHttpServer())
      .post(`/api/questions/${questionId}/answers`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ body: 'It is in building C, east wing.' })
    answerId = aRes.body._id
  })

  afterAll(async () => {
    await app.close()
  })

  // ── Helper ──────────────────────────────────────────────────────────────────

  function vote(value: 1 | -1) {
    return request(app.getHttpServer())
      .post(`/api/questions/${questionId}/answers/${answerId}/vote`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ value })
  }

  // ── Tests ───────────────────────────────────────────────────────────────────

  it('initial upvote count is 0', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/questions/${questionId}/answers`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200)

    const answer = res.body.find((a: any) => a._id === answerId)
    expect(answer.upvotes).toBe(0)
    expect(answer.downvotes).toBe(0)
  })

  it('user B upvotes → upvote count increments to 1', async () => {
    const res = await vote(1).expect(200)

    expect(res.body).toMatchObject({
      action: 'added',
      upvotes: 1,
      downvotes: 0,
    })
  })

  it('user B upvotes again → vote toggled off, count decrements back to 0', async () => {
    const res = await vote(1).expect(200)

    expect(res.body).toMatchObject({
      action: 'removed',
      upvotes: 0,
      downvotes: 0,
    })
  })

  it('user B switches from +1 to -1 → upvotes 0, downvotes 1', async () => {
    const res = await vote(-1).expect(200)

    expect(res.body).toMatchObject({
      action: 'changed',
      upvotes: 0,
      downvotes: 1,
    })
  })

  it('user B downvotes again → toggled off, downvotes back to 0', async () => {
    const res = await vote(-1).expect(200)

    expect(res.body).toMatchObject({
      action: 'removed',
      upvotes: 0,
      downvotes: 0,
    })
  })

  it('user A cannot vote on their own answer', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/questions/${questionId}/answers/${answerId}/vote`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ value: 1 })
      .expect(400)

    expect(res.body.message).toContain('own answer')
  })

  it('invalid vote value (0) is rejected by ValidationPipe', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/questions/${questionId}/answers/${answerId}/vote`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ value: 0 })
      .expect(400)

    expect(res.body.statusCode).toBe(400)
  })
})