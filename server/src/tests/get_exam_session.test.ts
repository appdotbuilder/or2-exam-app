
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, examSessionsTable } from '../db/schema';
import { getExamSession } from '../handlers/get_exam_session';
import { eq } from 'drizzle-orm';

describe('getExamSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return active exam session for student', async () => {
    // Create a student user
    const students = await db.insert(usersTable)
      .values({
        name: 'Test Student',
        nim: '123456789',
        attendance_number: 'A001',
        username: 'student1',
        password_hash: 'hashedpassword',
        role: 'student'
      })
      .returning()
      .execute();

    const studentId = students[0].id;

    // Create an active exam session
    const sessions = await db.insert(examSessionsTable)
      .values({
        student_id: studentId,
        duration_minutes: 30,
        is_active: true
      })
      .returning()
      .execute();

    const result = await getExamSession(studentId);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(sessions[0].id);
    expect(result!.student_id).toBe(studentId);
    expect(result!.is_active).toBe(true);
    expect(result!.duration_minutes).toBe(30);
    expect(result!.started_at).toBeInstanceOf(Date);
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return null when no active session exists', async () => {
    // Create a student user
    const students = await db.insert(usersTable)
      .values({
        name: 'Test Student',
        nim: '123456789',
        attendance_number: 'A001',
        username: 'student1',
        password_hash: 'hashedpassword',
        role: 'student'
      })
      .returning()
      .execute();

    const studentId = students[0].id;

    const result = await getExamSession(studentId);

    expect(result).toBeNull();
  });

  it('should return null when only inactive sessions exist', async () => {
    // Create a student user
    const students = await db.insert(usersTable)
      .values({
        name: 'Test Student',
        nim: '123456789',
        attendance_number: 'A001',
        username: 'student1',
        password_hash: 'hashedpassword',
        role: 'student'
      })
      .returning()
      .execute();

    const studentId = students[0].id;

    // Create an inactive exam session
    await db.insert(examSessionsTable)
      .values({
        student_id: studentId,
        duration_minutes: 30,
        is_active: false,
        ended_at: new Date()
      })
      .execute();

    const result = await getExamSession(studentId);

    expect(result).toBeNull();
  });

  it('should mark expired session as inactive and return it', async () => {
    // Create a student user
    const students = await db.insert(usersTable)
      .values({
        name: 'Test Student',
        nim: '123456789',
        attendance_number: 'A001',
        username: 'student1',
        password_hash: 'hashedpassword',
        role: 'student'
      })
      .returning()
      .execute();

    const studentId = students[0].id;

    // Create an expired exam session (started 1 hour ago with 30 min duration)
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const sessions = await db.insert(examSessionsTable)
      .values({
        student_id: studentId,
        started_at: oneHourAgo,
        duration_minutes: 30,
        is_active: true
      })
      .returning()
      .execute();

    const sessionId = sessions[0].id;

    const result = await getExamSession(studentId);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(sessionId);
    expect(result!.is_active).toBe(false);
    expect(result!.ended_at).toBeInstanceOf(Date);

    // Verify the session was updated in the database
    const updatedSessions = await db.select()
      .from(examSessionsTable)
      .where(eq(examSessionsTable.id, sessionId))
      .execute();

    expect(updatedSessions[0].is_active).toBe(false);
    expect(updatedSessions[0].ended_at).toBeInstanceOf(Date);
  });

  it('should return active session when not expired', async () => {
    // Create a student user
    const students = await db.insert(usersTable)
      .values({
        name: 'Test Student',
        nim: '123456789',
        attendance_number: 'A001',
        username: 'student1',
        password_hash: 'hashedpassword',
        role: 'student'
      })
      .returning()
      .execute();

    const studentId = students[0].id;

    // Create a recent exam session (within the duration)
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

    const sessions = await db.insert(examSessionsTable)
      .values({
        student_id: studentId,
        started_at: fiveMinutesAgo,
        duration_minutes: 30,
        is_active: true
      })
      .returning()
      .execute();

    const result = await getExamSession(studentId);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(sessions[0].id);
    expect(result!.is_active).toBe(true);
    expect(result!.ended_at).toBeNull();
  });
});
