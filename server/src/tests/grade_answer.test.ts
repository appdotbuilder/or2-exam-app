
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, questionsTable, examSessionsTable, studentAnswersTable } from '../db/schema';
import { type GradeAnswerInput } from '../schema';
import { gradeAnswer } from '../handlers/grade_answer';
import { eq } from 'drizzle-orm';

// Test data
const lecturerUser = {
  name: 'Test Lecturer',
  nim: null,
  attendance_number: null,
  username: 'lecturer1',
  password_hash: 'hashedpassword',
  role: 'lecturer' as const
};

const studentUser = {
  name: 'Test Student',
  nim: '12345',
  attendance_number: '001',
  username: 'student1',
  password_hash: 'hashedpassword',
  role: 'student' as const
};

const testQuestion = {
  topic: 'monte_carlo' as const,
  question_text: 'Test question',
  answer_key: 'Test answer',
  max_score: '10.00',
  status: 'active' as const,
  is_auto_generated: false,
  created_by: 1 // Will be set to lecturer ID
};

const testInput: GradeAnswerInput = {
  answer_id: 1, // Will be set to actual answer ID
  score: 8.5,
  graded_by: 1 // Will be set to lecturer ID
};

describe('gradeAnswer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should grade an answer successfully', async () => {
    // Create prerequisite data
    const lecturer = await db.insert(usersTable)
      .values(lecturerUser)
      .returning()
      .execute();

    const student = await db.insert(usersTable)
      .values(studentUser)
      .returning()
      .execute();

    const question = await db.insert(questionsTable)
      .values({ ...testQuestion, created_by: lecturer[0].id })
      .returning()
      .execute();

    const session = await db.insert(examSessionsTable)
      .values({
        student_id: student[0].id,
        duration_minutes: 30,
        is_active: true
      })
      .returning()
      .execute();

    const answer = await db.insert(studentAnswersTable)
      .values({
        session_id: session[0].id,
        question_id: question[0].id,
        answer_text: 'Student answer text',
        attachment_path: null,
        score: null,
        graded_by: null,
        graded_at: null
      })
      .returning()
      .execute();

    const input: GradeAnswerInput = {
      answer_id: answer[0].id,
      score: 8.5,
      graded_by: lecturer[0].id
    };

    const result = await gradeAnswer(input);

    // Validate result
    expect(result.id).toEqual(answer[0].id);
    expect(result.score).toEqual(8.5);
    expect(typeof result.score).toBe('number');
    expect(result.graded_by).toEqual(lecturer[0].id);
    expect(result.graded_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save graded answer to database', async () => {
    // Create prerequisite data
    const lecturer = await db.insert(usersTable)
      .values(lecturerUser)
      .returning()
      .execute();

    const student = await db.insert(usersTable)
      .values(studentUser)
      .returning()
      .execute();

    const question = await db.insert(questionsTable)
      .values({ ...testQuestion, created_by: lecturer[0].id })
      .returning()
      .execute();

    const session = await db.insert(examSessionsTable)
      .values({
        student_id: student[0].id,
        duration_minutes: 30,
        is_active: true
      })
      .returning()
      .execute();

    const answer = await db.insert(studentAnswersTable)
      .values({
        session_id: session[0].id,
        question_id: question[0].id,
        answer_text: 'Student answer text',
        attachment_path: null,
        score: null,
        graded_by: null,
        graded_at: null
      })
      .returning()
      .execute();

    const input: GradeAnswerInput = {
      answer_id: answer[0].id,
      score: 7.25,
      graded_by: lecturer[0].id
    };

    await gradeAnswer(input);

    // Query database to verify the answer was updated
    const updatedAnswer = await db.select()
      .from(studentAnswersTable)
      .where(eq(studentAnswersTable.id, answer[0].id))
      .execute();

    expect(updatedAnswer).toHaveLength(1);
    expect(parseFloat(updatedAnswer[0].score!)).toEqual(7.25);
    expect(updatedAnswer[0].graded_by).toEqual(lecturer[0].id);
    expect(updatedAnswer[0].graded_at).toBeInstanceOf(Date);
    expect(updatedAnswer[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when grader is not found', async () => {
    // Create prerequisite data
    const lecturer = await db.insert(usersTable)
      .values(lecturerUser)
      .returning()
      .execute();

    const student = await db.insert(usersTable)
      .values(studentUser)
      .returning()
      .execute();

    const question = await db.insert(questionsTable)
      .values({ ...testQuestion, created_by: lecturer[0].id })
      .returning()
      .execute();

    const session = await db.insert(examSessionsTable)
      .values({
        student_id: student[0].id,
        duration_minutes: 30,
        is_active: true
      })
      .returning()
      .execute();

    const answer = await db.insert(studentAnswersTable)
      .values({
        session_id: session[0].id,
        question_id: question[0].id,
        answer_text: 'Student answer text',
        attachment_path: null,
        score: null,
        graded_by: null,
        graded_at: null
      })
      .returning()
      .execute();

    const input: GradeAnswerInput = {
      answer_id: answer[0].id,
      score: 8.5,
      graded_by: 999 // Non-existent user ID
    };

    await expect(gradeAnswer(input)).rejects.toThrow(/grader not found/i);
  });

  it('should throw error when grader is not a lecturer', async () => {
    // Create prerequisite data
    const lecturer = await db.insert(usersTable)
      .values(lecturerUser)
      .returning()
      .execute();

    const student = await db.insert(usersTable)
      .values(studentUser)
      .returning()
      .execute();

    const question = await db.insert(questionsTable)
      .values({ ...testQuestion, created_by: lecturer[0].id })
      .returning()
      .execute();

    const session = await db.insert(examSessionsTable)
      .values({
        student_id: student[0].id,
        duration_minutes: 30,
        is_active: true
      })
      .returning()
      .execute();

    const answer = await db.insert(studentAnswersTable)
      .values({
        session_id: session[0].id,
        question_id: question[0].id,
        answer_text: 'Student answer text',
        attachment_path: null,
        score: null,
        graded_by: null,
        graded_at: null
      })
      .returning()
      .execute();

    const input: GradeAnswerInput = {
      answer_id: answer[0].id,
      score: 8.5,
      graded_by: student[0].id // Student trying to grade
    };

    await expect(gradeAnswer(input)).rejects.toThrow(/only lecturers can grade answers/i);
  });

  it('should throw error when answer is not found', async () => {
    // Create prerequisite data
    const lecturer = await db.insert(usersTable)
      .values(lecturerUser)
      .returning()
      .execute();

    const input: GradeAnswerInput = {
      answer_id: 999, // Non-existent answer ID
      score: 8.5,
      graded_by: lecturer[0].id
    };

    await expect(gradeAnswer(input)).rejects.toThrow(/answer not found/i);
  });
});
