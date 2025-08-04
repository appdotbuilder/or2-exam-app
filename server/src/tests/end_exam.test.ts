
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, examSessionsTable } from '../db/schema';
import { endExam } from '../handlers/end_exam';
import { eq } from 'drizzle-orm';

describe('endExam', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should end an active exam session', async () => {
    // Create a test user (student)
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test Student',
        nim: '12345678',
        attendance_number: 'A001',
        username: 'teststudent',
        password_hash: 'hashedpassword',
        role: 'student'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create an active exam session
    const sessionResult = await db.insert(examSessionsTable)
      .values({
        student_id: userId,
        duration_minutes: 30,
        is_active: true
      })
      .returning()
      .execute();

    const sessionId = sessionResult[0].id;

    // End the exam session
    const result = await endExam(sessionId);

    // Verify the result
    expect(result.id).toEqual(sessionId);
    expect(result.student_id).toEqual(userId);
    expect(result.ended_at).toBeInstanceOf(Date);
    expect(result.is_active).toBe(false);
    expect(result.duration_minutes).toEqual(30);
    expect(result.started_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save ended exam session to database', async () => {
    // Create a test user (student)
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test Student',
        nim: '12345678',
        attendance_number: 'A001',
        username: 'teststudent',
        password_hash: 'hashedpassword',
        role: 'student'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create an active exam session
    const sessionResult = await db.insert(examSessionsTable)
      .values({
        student_id: userId,
        duration_minutes: 45,
        is_active: true
      })
      .returning()
      .execute();

    const sessionId = sessionResult[0].id;

    // End the exam session
    await endExam(sessionId);

    // Query the database to verify the session was updated
    const sessions = await db.select()
      .from(examSessionsTable)
      .where(eq(examSessionsTable.id, sessionId))
      .execute();

    expect(sessions).toHaveLength(1);
    const session = sessions[0];
    expect(session.is_active).toBe(false);
    expect(session.ended_at).toBeInstanceOf(Date);
    expect(session.duration_minutes).toEqual(45);
  });

  it('should throw error when session not found', async () => {
    const nonExistentSessionId = 999;

    expect(endExam(nonExistentSessionId)).rejects.toThrow(/session with id 999 not found/i);
  });

  it('should set ended_at timestamp correctly', async () => {
    // Create a test user (student)
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test Student',
        nim: '12345678',
        attendance_number: 'A001',
        username: 'teststudent',
        password_hash: 'hashedpassword',
        role: 'student'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create an active exam session
    const sessionResult = await db.insert(examSessionsTable)
      .values({
        student_id: userId,
        duration_minutes: 30,
        is_active: true
      })
      .returning()
      .execute();

    const sessionId = sessionResult[0].id;
    const beforeEndTime = new Date();

    // End the exam session
    const result = await endExam(sessionId);

    const afterEndTime = new Date();

    // Verify ended_at is within reasonable time range
    expect(result.ended_at).toBeInstanceOf(Date);
    expect(result.ended_at!.getTime()).toBeGreaterThanOrEqual(beforeEndTime.getTime());
    expect(result.ended_at!.getTime()).toBeLessThanOrEqual(afterEndTime.getTime());
  });
});
