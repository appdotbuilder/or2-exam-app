
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, examSessionsTable } from '../db/schema';
import { type StartExamInput } from '../schema';
import { startExam } from '../handlers/start_exam';
import { eq, and } from 'drizzle-orm';

describe('startExam', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let studentId: number;
  let lecturerId: number;

  beforeEach(async () => {
    // Create test student
    const studentResult = await db.insert(usersTable)
      .values({
        name: 'Test Student',
        nim: '123456789',
        attendance_number: 'A001',
        username: 'teststudent',
        password_hash: 'hashedpassword',
        role: 'student'
      })
      .returning()
      .execute();
    studentId = studentResult[0].id;

    // Create test lecturer
    const lecturerResult = await db.insert(usersTable)
      .values({
        name: 'Test Lecturer',
        nim: null,
        attendance_number: null,
        username: 'testlecturer',
        password_hash: 'hashedpassword',
        role: 'lecturer'
      })
      .returning()
      .execute();
    lecturerId = lecturerResult[0].id;
  });

  it('should start an exam session for a student', async () => {
    const input: StartExamInput = {
      student_id: studentId
    };

    const result = await startExam(input);

    expect(result.student_id).toEqual(studentId);
    expect(result.duration_minutes).toEqual(30);
    expect(result.is_active).toBe(true);
    expect(result.ended_at).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.started_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save exam session to database', async () => {
    const input: StartExamInput = {
      student_id: studentId
    };

    const result = await startExam(input);

    const sessions = await db.select()
      .from(examSessionsTable)
      .where(eq(examSessionsTable.id, result.id))
      .execute();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].student_id).toEqual(studentId);
    expect(sessions[0].duration_minutes).toEqual(30);
    expect(sessions[0].is_active).toBe(true);
    expect(sessions[0].ended_at).toBeNull();
  });

  it('should throw error when student does not exist', async () => {
    const input: StartExamInput = {
      student_id: 99999
    };

    await expect(startExam(input)).rejects.toThrow(/student not found/i);
  });

  it('should throw error when user is not a student', async () => {
    const input: StartExamInput = {
      student_id: lecturerId
    };

    await expect(startExam(input)).rejects.toThrow(/user is not a student/i);
  });

  it('should throw error when student already has active exam session', async () => {
    // Create active exam session
    await db.insert(examSessionsTable)
      .values({
        student_id: studentId,
        duration_minutes: 30,
        is_active: true
      })
      .execute();

    const input: StartExamInput = {
      student_id: studentId
    };

    await expect(startExam(input)).rejects.toThrow(/already has an active exam session/i);
  });

  it('should allow starting new exam if previous session is inactive', async () => {
    // Create inactive exam session
    await db.insert(examSessionsTable)
      .values({
        student_id: studentId,
        duration_minutes: 30,
        is_active: false,
        ended_at: new Date()
      })
      .execute();

    const input: StartExamInput = {
      student_id: studentId
    };

    const result = await startExam(input);

    expect(result.student_id).toEqual(studentId);
    expect(result.is_active).toBe(true);

    // Verify we have 2 sessions for this student (1 inactive, 1 active)
    const allSessions = await db.select()
      .from(examSessionsTable)
      .where(eq(examSessionsTable.student_id, studentId))
      .execute();

    expect(allSessions).toHaveLength(2);
    
    const activeSessions = allSessions.filter(session => session.is_active);
    expect(activeSessions).toHaveLength(1);
    expect(activeSessions[0].id).toEqual(result.id);
  });
});
