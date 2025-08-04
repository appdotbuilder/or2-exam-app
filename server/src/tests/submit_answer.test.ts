
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, questionsTable, examSessionsTable, studentAnswersTable } from '../db/schema';
import { type SubmitAnswerInput } from '../schema';
import { submitAnswer } from '../handlers/submit_answer';
import { eq, and } from 'drizzle-orm';

describe('submitAnswer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let studentId: number;
  let lecturerId: number;
  let questionId: number;
  let sessionId: number;

  beforeEach(async () => {
    // Create test lecturer
    const lecturers = await db.insert(usersTable)
      .values({
        name: 'Test Lecturer',
        username: 'lecturer1',
        password_hash: 'hashedpassword',
        role: 'lecturer'
      })
      .returning()
      .execute();
    lecturerId = lecturers[0].id;

    // Create test student
    const students = await db.insert(usersTable)
      .values({
        name: 'Test Student',
        nim: '12345678',
        attendance_number: 'A001',
        username: 'student1',
        password_hash: 'hashedpassword',
        role: 'student'
      })
      .returning()
      .execute();
    studentId = students[0].id;

    // Create test question
    const questions = await db.insert(questionsTable)
      .values({
        topic: 'monte_carlo',
        question_text: 'Test question',
        answer_key: 'Test answer key',
        max_score: '10.00',
        status: 'active',
        created_by: lecturerId
      })
      .returning()
      .execute();
    questionId = questions[0].id;

    // Create test exam session
    const sessions = await db.insert(examSessionsTable)
      .values({
        student_id: studentId,
        duration_minutes: 30,
        is_active: true
      })
      .returning()
      .execute();
    sessionId = sessions[0].id;
  });

  it('should create new answer when none exists', async () => {
    const input: SubmitAnswerInput = {
      session_id: sessionId,
      question_id: questionId,
      answer_text: 'My answer to the question',
      attachment_path: null
    };

    const result = await submitAnswer(input);

    expect(result.session_id).toEqual(sessionId);
    expect(result.question_id).toEqual(questionId);
    expect(result.answer_text).toEqual('My answer to the question');
    expect(result.attachment_path).toBeNull();
    expect(result.score).toBeNull();
    expect(result.graded_by).toBeNull();
    expect(result.graded_at).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save new answer to database', async () => {
    const input: SubmitAnswerInput = {
      session_id: sessionId,
      question_id: questionId,
      answer_text: 'My answer to the question',
      attachment_path: '/uploads/answer.pdf'
    };

    const result = await submitAnswer(input);

    const savedAnswers = await db.select()
      .from(studentAnswersTable)
      .where(eq(studentAnswersTable.id, result.id))
      .execute();

    expect(savedAnswers).toHaveLength(1);
    expect(savedAnswers[0].session_id).toEqual(sessionId);
    expect(savedAnswers[0].question_id).toEqual(questionId);
    expect(savedAnswers[0].answer_text).toEqual('My answer to the question');
    expect(savedAnswers[0].attachment_path).toEqual('/uploads/answer.pdf');
    expect(savedAnswers[0].score).toBeNull();
  });

  it('should update existing answer when one already exists', async () => {
    // First, create an initial answer
    const initialInput: SubmitAnswerInput = {
      session_id: sessionId,
      question_id: questionId,
      answer_text: 'Initial answer',
      attachment_path: null
    };

    const initialResult = await submitAnswer(initialInput);

    // Then update it
    const updateInput: SubmitAnswerInput = {
      session_id: sessionId,
      question_id: questionId,
      answer_text: 'Updated answer',
      attachment_path: '/uploads/updated.pdf'
    };

    const updatedResult = await submitAnswer(updateInput);

    // Should have same ID but updated content
    expect(updatedResult.id).toEqual(initialResult.id);
    expect(updatedResult.answer_text).toEqual('Updated answer');
    expect(updatedResult.attachment_path).toEqual('/uploads/updated.pdf');
    expect(updatedResult.updated_at.getTime()).toBeGreaterThan(updatedResult.created_at.getTime());
  });

  it('should only have one answer record per question per session', async () => {
    const input: SubmitAnswerInput = {
      session_id: sessionId,
      question_id: questionId,
      answer_text: 'First submission',
      attachment_path: null
    };

    // Submit first answer
    await submitAnswer(input);

    // Submit updated answer
    input.answer_text = 'Second submission';
    await submitAnswer(input);

    // Check only one record exists
    const answers = await db.select()
      .from(studentAnswersTable)
      .where(
        and(
          eq(studentAnswersTable.session_id, sessionId),
          eq(studentAnswersTable.question_id, questionId)
        )
      )
      .execute();

    expect(answers).toHaveLength(1);
    expect(answers[0].answer_text).toEqual('Second submission');
  });

  it('should handle answers with only attachment path', async () => {
    const input: SubmitAnswerInput = {
      session_id: sessionId,
      question_id: questionId,
      answer_text: null,
      attachment_path: '/uploads/solution.jpg'
    };

    const result = await submitAnswer(input);

    expect(result.answer_text).toBeNull();
    expect(result.attachment_path).toEqual('/uploads/solution.jpg');
  });

  it('should handle answers with both text and attachment', async () => {
    const input: SubmitAnswerInput = {
      session_id: sessionId,
      question_id: questionId,
      answer_text: 'See attached file for detailed solution',
      attachment_path: '/uploads/detailed_solution.pdf'
    };

    const result = await submitAnswer(input);

    expect(result.answer_text).toEqual('See attached file for detailed solution');
    expect(result.attachment_path).toEqual('/uploads/detailed_solution.pdf');
  });

  it('should preserve existing score when updating answer', async () => {
    // Create initial answer
    const input: SubmitAnswerInput = {
      session_id: sessionId,
      question_id: questionId,
      answer_text: 'Initial answer',
      attachment_path: null
    };

    const initialAnswer = await submitAnswer(input);

    // Manually grade the answer (simulate grading)
    await db.update(studentAnswersTable)
      .set({
        score: '8.50',
        graded_by: lecturerId,
        graded_at: new Date()
      })
      .where(eq(studentAnswersTable.id, initialAnswer.id))
      .execute();

    // Update the answer
    const updateInput: SubmitAnswerInput = {
      session_id: sessionId,
      question_id: questionId,
      answer_text: 'Updated answer after grading',
      attachment_path: null
    };

    const updatedAnswer = await submitAnswer(updateInput);

    // Score should be preserved (converted to number)
    expect(updatedAnswer.score).toEqual(8.5);
    expect(typeof updatedAnswer.score).toBe('number');
    expect(updatedAnswer.graded_by).toEqual(lecturerId);
    expect(updatedAnswer.graded_at).toBeInstanceOf(Date);
    expect(updatedAnswer.answer_text).toEqual('Updated answer after grading');
  });
});
