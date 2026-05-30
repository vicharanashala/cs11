/**
 * Seed script for DocumentStatus records.
 *
 * Usage:
 *   1. Set STUDENT_EMAIL below to your test student account email.
 *   2. Run: node seed-document-status.js
 *
 * Uses MONGO_URI from .env at the project root.
 */

require('dotenv').config({ path: require('path').join(__dirname, 'backend', '.env') })

const mongoose = require('mongoose')

const STUDENT_EMAIL = '' // <-- paste your test student email here before running

const DOCUMENT_STATUS_RECORDS = [
  {
    documentType: 'noc',
    status: 'completed',
    completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
  },
  {
    documentType: 'offer_letter_download',
    status: 'completed',
    completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
  },
  {
    documentType: 'offer_letter_acceptance',
    status: 'under_review',
  },
  {
    documentType: 'internship_beginning',
    status: 'pending',
  },
]

async function seed() {
  if (!STUDENT_EMAIL) {
    console.error('Error: Please set STUDENT_EMAIL at the top of this script.')
    process.exit(1)
  }

  if (!process.env.MONGO_URI) {
    console.error('Error: MONGO_URI is not set in backend/.env')
    process.exit(1)
  }

  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected to MongoDB')

  const usersCollection = mongoose.connection.collection('users')
  const student = await usersCollection.findOne({ email: STUDENT_EMAIL })
  if (!student) {
    console.error(`Error: No user found with email "${STUDENT_EMAIL}"`)
    await mongoose.disconnect()
    process.exit(1)
  }

  const studentId = student._id
  console.log(`Found student: ${student.name} (${student._id})`)

  const collection = mongoose.connection.collection('documentstatuses')

  let insertedCount = 0
  for (const record of DOCUMENT_STATUS_RECORDS) {
    const result = await collection.updateOne(
      { studentId, documentType: record.documentType },
      {
        $set: {
          studentId,
          documentType: record.documentType,
          status: record.status,
          ...(record.completedAt ? { completedAt: record.completedAt } : {}),
        },
        $setOnInsert: {
          reviewedBy: null,
          rejectionReason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    )
    if (result.upsertedCount > 0 || result.modifiedCount > 0) {
      insertedCount++
    }
    console.log(`  Upserted documentType="${record.documentType}", status="${record.status}"`)
  }

  console.log(
    `\nDone. ${insertedCount} record(s) upserted for studentId: ${studentId}`,
  )

  await mongoose.disconnect()
  console.log('Disconnected')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  mongoose.disconnect()
  process.exit(1)
})