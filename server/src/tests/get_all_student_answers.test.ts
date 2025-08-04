
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, questionsTable, examSessionsTable, studentAnswersTable } from '../db/schema';
import { getAllStudentAnswers } from '../handlers/get_all_student_answers';

describe('getAllStudentAnswers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let lecturerId: number;
  let studentId: number;
  let questionId: number;
  let sessionId: number;

  beforeEach(async () => {
    // Create test lecturer
    const lecturerResult = await db.insert(usersTable)
      .values({
        name: 'Test Lecturer',
        username: 'lecturer1',
        password_hash: 'hashed_password',
        role: 'lecturer'
      })
      .returning()
      .execute();
    lecturerId = lecturerResult[0].id;

    // Create test student
    const studentResult = await db.insert(usersTable)
      .values({
        name: 'Test Student',
        nim: '12345',
        attendance_number: 'A001',
        username: 'student1',
        password_hash: 'hashed_password',
        role: 'student'
      })
      .returning()
      .execute();
    studentId = studentResult[0].id;

    // Create test question
    const questionResult = await db.insert(questionsTable)
      .values({
        topic: 'monte_carlo',
        question_text: 'Test question',
        answer_key: 'Test answer',
        max_score: '10.00',
        status: 'active',
        is_auto_generated: false,
        created_by: lecturerId
      })
      .returning()
      .execute();
    questionId = questionResult[0].id;

    // Create test exam session
    const sessionResult = await db.insert(examSessionsTable)
      .values({
        student_id: studentId,
        duration_minutes: 30,
        is_active: true
      })
      .returning()
      .execute();
    sessionId = sessionResult[0].id;
  });

  it('should return all student answers for a valid lecturer', async () => {
    // Create test student answer
    await db.insert(studentAnswersTable)
      .values({
        session_id: sessionId,
        question_id: questionId,
        answer_text: 'Student answer text',
        attachment_path: null,
        score: '8.50',
        graded_by: lecturerId,
        graded_at: new Date()
      })
      .execute();

    const result = await getAllStudentAnswers(lecturerId);

    expect(result).toHaveLength(1);
    expect(result[0].session_id).toEqual(sessionId);
    expect(result[0].question_id).toEqual(questionId);
    expect(result[0].answer_text).toEqual('Student answer text');
    expect(result[0].score).toEqual(8.5); // Numeric conversion
    expect(typeof result[0].score).toBe('number');
    expect(result[0].graded_by).toEqual(lecturerId);
    expect(result[0].graded_at).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return multiple student answers from different students', async () => {
    // Create second student
    const student2Result = await db.insert(usersTable)
      .values({
        name: 'Second Student',
        nim: '67890',
        attendance_number: 'A002',
        username: 'student2',
        password_hash: 'hashed_password',
        role: 'student'
      })
      .returning()
      .execute();

    // Create second exam session
    const session2Result = await db.insert(examSessionsTable)
      .values({
        student_id: student2Result[0].id,
        duration_minutes: 30,
        is_active: true
      })
      .returning()
      .execute();

    // Create answers from both students
    await db.insert(studentAnswersTable)
      .values([
        {
          session_id: sessionId,
          question_id: questionId,
          answer_text: 'First student answer',
          score: '9.00'
        },
        {
          session_id: session2Result[0].id,
          question_id: questionId,
          answer_text: 'Second student answer',
          score: '7.50'
        }
      ])
      .execute();

    const result = await getAllStudentAnswers(lecturerId);

    expect(result).toHaveLength(2);
    expect(result.map(a => a.answer_text)).toContain('First student answer');
    expect(result.map(a => a.answer_text)).toContain('Second student answer');
    expect(result.map(a => a.score)).toContain(9.0);
    expect(result.map(a => a.score)).toContain(7.5);
  });

  it('should handle ungraded answers correctly', async () => {
    // Create ungraded answer
    await db.insert(studentAnswersTable)
      .values({
        session_id: sessionId,
        question_id: questionId,
        answer_text: 'Ungraded answer',
        score: null,
        graded_by: null,
        graded_at: null
      })
      .execute();

    const result = await getAllStudentAnswers(lecturerId);

    expect(result).toHaveLength(1);
    expect(result[0].answer_text).toEqual('Ungraded answer');
    expect(result[0].score).toBeNull();
    expect(result[0].graded_by).toBeNull();
    expect(result[0].graded_at).toBeNull();
  });

  it('should throw error for non-existent lecturer', async () => {
    const nonExistentLecturerId = 99999;

    await expect(getAllStudentAnswers(nonExistentLecturerId))
      .rejects.toThrow(/unauthorized.*only lecturers/i);
  });

  it('should throw error for non-lecturer user', async () => {
    // Try to access with student ID instead of lecturer ID
    await expect(getAllStudentAnswers(studentId))
      .rejects.toThrow(/unauthorized.*only lecturers/i);
  });

  it('should return empty array when no answers exist', async () => {
    const result = await getAllStudentAnswers(lecturerId);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });
});
