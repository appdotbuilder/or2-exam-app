
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, questionsTable } from '../db/schema';
import { type UpdateQuestionInput } from '../schema';
import { updateQuestion } from '../handlers/update_question';
import { eq } from 'drizzle-orm';

describe('updateQuestion', () => {
  let lecturerId: number;
  let otherLecturerId: number;
  let questionId: number;

  beforeEach(async () => {
    await createDB();

    // Create test lecturers
    const lecturer1 = await db.insert(usersTable)
      .values({
        name: 'Test Lecturer',
        username: 'lecturer1',
        password_hash: 'hashed_password_123',
        role: 'lecturer'
      })
      .returning()
      .execute();
    lecturerId = lecturer1[0].id;

    const lecturer2 = await db.insert(usersTable)
      .values({
        name: 'Other Lecturer',
        username: 'lecturer2',
        password_hash: 'hashed_password_456',
        role: 'lecturer'
      })
      .returning()
      .execute();
    otherLecturerId = lecturer2[0].id;

    // Create test question
    const question = await db.insert(questionsTable)
      .values({
        topic: 'monte_carlo',
        question_text: 'Original question text',
        answer_key: 'Original answer',
        max_score: '10.00',
        status: 'draft',
        is_auto_generated: false,
        created_by: lecturerId
      })
      .returning()
      .execute();
    questionId = question[0].id;
  });

  afterEach(resetDB);

  it('should update question fields', async () => {
    const input: UpdateQuestionInput = {
      id: questionId,
      topic: 'markov_chain',
      question_text: 'Updated question text',
      answer_key: 'Updated answer',
      max_score: 15.5,
      status: 'approved'
    };

    const result = await updateQuestion(input, lecturerId);

    expect(result.id).toEqual(questionId);
    expect(result.topic).toEqual('markov_chain');
    expect(result.question_text).toEqual('Updated question text');
    expect(result.answer_key).toEqual('Updated answer');
    expect(result.max_score).toEqual(15.5);
    expect(result.status).toEqual('approved');
    expect(result.created_by).toEqual(lecturerId);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only provided fields', async () => {
    const input: UpdateQuestionInput = {
      id: questionId,
      question_text: 'Only text updated',
      status: 'active'
    };

    const result = await updateQuestion(input, lecturerId);

    expect(result.question_text).toEqual('Only text updated');
    expect(result.status).toEqual('active');
    // Original fields should remain unchanged
    expect(result.topic).toEqual('monte_carlo');
    expect(result.answer_key).toEqual('Original answer');
    expect(result.max_score).toEqual(10);
  });

  it('should save updated question to database', async () => {
    const input: UpdateQuestionInput = {
      id: questionId,
      question_text: 'Database test update',
      max_score: 20
    };

    await updateQuestion(input, lecturerId);

    const questions = await db.select()
      .from(questionsTable)
      .where(eq(questionsTable.id, questionId))
      .execute();

    expect(questions).toHaveLength(1);
    expect(questions[0].question_text).toEqual('Database test update');
    expect(parseFloat(questions[0].max_score)).toEqual(20);
    expect(questions[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent question', async () => {
    const input: UpdateQuestionInput = {
      id: 999999,
      question_text: 'This should fail'
    };

    expect(updateQuestion(input, lecturerId)).rejects.toThrow(/question not found/i);
  });

  it('should throw error when lecturer does not own question', async () => {
    const input: UpdateQuestionInput = {
      id: questionId,
      question_text: 'Unauthorized update'
    };

    expect(updateQuestion(input, otherLecturerId)).rejects.toThrow(/question not found or access denied/i);
  });

  it('should handle null answer_key correctly', async () => {
    const input: UpdateQuestionInput = {
      id: questionId,
      answer_key: null
    };

    const result = await updateQuestion(input, lecturerId);

    expect(result.answer_key).toBeNull();

    // Verify in database
    const questions = await db.select()
      .from(questionsTable)
      .where(eq(questionsTable.id, questionId))
      .execute();

    expect(questions[0].answer_key).toBeNull();
  });

  it('should handle numeric conversion correctly', async () => {
    const input: UpdateQuestionInput = {
      id: questionId,
      max_score: 12.75
    };

    const result = await updateQuestion(input, lecturerId);

    expect(typeof result.max_score).toEqual('number');
    expect(result.max_score).toEqual(12.75);

    // Verify database storage
    const questions = await db.select()
      .from(questionsTable)
      .where(eq(questionsTable.id, questionId))
      .execute();

    expect(parseFloat(questions[0].max_score)).toEqual(12.75);
  });
});
