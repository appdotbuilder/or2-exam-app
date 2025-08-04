
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, questionsTable } from '../db/schema';
import { approveQuestion } from '../handlers/approve_question';
import { eq } from 'drizzle-orm';

describe('approveQuestion', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should approve a draft question', async () => {
    // Create a lecturer user
    const lecturer = await db.insert(usersTable)
      .values({
        name: 'Test Lecturer',
        username: 'lecturer1',
        password_hash: 'hashed_password',
        role: 'lecturer'
      })
      .returning()
      .execute();

    // Create a draft question
    const question = await db.insert(questionsTable)
      .values({
        topic: 'monte_carlo',
        question_text: 'Test question for approval',
        answer_key: 'Test answer',
        max_score: '10.00',
        status: 'draft',
        is_auto_generated: false,
        created_by: lecturer[0].id
      })
      .returning()
      .execute();

    const result = await approveQuestion(question[0].id, lecturer[0].id);

    // Verify the question was approved
    expect(result.id).toEqual(question[0].id);
    expect(result.status).toEqual('approved');
    expect(result.topic).toEqual('monte_carlo');
    expect(result.question_text).toEqual('Test question for approval');
    expect(result.answer_key).toEqual('Test answer');
    expect(result.max_score).toEqual(10);
    expect(typeof result.max_score).toEqual('number');
    expect(result.is_auto_generated).toEqual(false);
    expect(result.created_by).toEqual(lecturer[0].id);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update the question in database', async () => {
    // Create a lecturer user
    const lecturer = await db.insert(usersTable)
      .values({
        name: 'Test Lecturer',
        username: 'lecturer1',
        password_hash: 'hashed_password',
        role: 'lecturer'
      })
      .returning()
      .execute();

    // Create a draft question
    const question = await db.insert(questionsTable)
      .values({
        topic: 'markov_chain',
        question_text: 'Test question for database update',
        answer_key: null,
        max_score: '15.50',
        status: 'draft',
        is_auto_generated: true,
        created_by: lecturer[0].id
      })
      .returning()
      .execute();

    const originalUpdatedAt = question[0].updated_at;

    await approveQuestion(question[0].id, lecturer[0].id);

    // Query the database to verify the update
    const updatedQuestion = await db.select()
      .from(questionsTable)
      .where(eq(questionsTable.id, question[0].id))
      .execute();

    expect(updatedQuestion).toHaveLength(1);
    expect(updatedQuestion[0].status).toEqual('approved');
    expect(updatedQuestion[0].updated_at).toBeInstanceOf(Date);
    expect(updatedQuestion[0].updated_at > originalUpdatedAt).toBe(true);
    expect(parseFloat(updatedQuestion[0].max_score)).toEqual(15.5);
  });

  it('should throw error for non-existent question', async () => {
    const nonExistentId = 999;
    const lecturerId = 1;

    await expect(approveQuestion(nonExistentId, lecturerId))
      .rejects.toThrow(/question not found/i);
  });

  it('should throw error for non-draft question', async () => {
    // Create a lecturer user
    const lecturer = await db.insert(usersTable)
      .values({
        name: 'Test Lecturer',
        username: 'lecturer1',
        password_hash: 'hashed_password',
        role: 'lecturer'
      })
      .returning()
      .execute();

    // Create an already approved question
    const question = await db.insert(questionsTable)
      .values({
        topic: 'dynamic_programming',
        question_text: 'Already approved question',
        answer_key: 'Answer',
        max_score: '20.00',
        status: 'approved',
        is_auto_generated: false,
        created_by: lecturer[0].id
      })
      .returning()
      .execute();

    await expect(approveQuestion(question[0].id, lecturer[0].id))
      .rejects.toThrow(/only draft questions can be approved/i);
  });

  it('should handle questions with different topics and scores', async () => {
    // Create a lecturer user
    const lecturer = await db.insert(usersTable)
      .values({
        name: 'Test Lecturer',
        username: 'lecturer1',
        password_hash: 'hashed_password',
        role: 'lecturer'
      })
      .returning()
      .execute();

    // Create a question with game theory topic
    const question = await db.insert(questionsTable)
      .values({
        topic: 'game_theory',
        question_text: 'Game theory question',
        answer_key: 'Nash equilibrium',
        max_score: '25.75',
        status: 'draft',
        is_auto_generated: false,
        created_by: lecturer[0].id
      })
      .returning()
      .execute();

    const result = await approveQuestion(question[0].id, lecturer[0].id);

    expect(result.topic).toEqual('game_theory');
    expect(result.max_score).toEqual(25.75);
    expect(result.status).toEqual('approved');
    expect(result.answer_key).toEqual('Nash equilibrium');
  });
});
