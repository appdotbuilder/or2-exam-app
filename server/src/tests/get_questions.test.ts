
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, questionsTable } from '../db/schema';
import { getQuestions } from '../handlers/get_questions';

describe('getQuestions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all questions when lecturerId is provided', async () => {
    // Create a lecturer user
    const lecturerResult = await db.insert(usersTable).values({
      name: 'Test Lecturer',
      username: 'lecturer1',
      password_hash: 'hashedpass',
      role: 'lecturer'
    }).returning().execute();
    const lecturerId = lecturerResult[0].id;

    // Create questions with different statuses
    await db.insert(questionsTable).values([
      {
        topic: 'monte_carlo',
        question_text: 'Draft question',
        max_score: '10.00',
        status: 'draft',
        created_by: lecturerId,
        is_auto_generated: false
      },
      {
        topic: 'markov_chain',
        question_text: 'Approved question',
        max_score: '15.50',
        status: 'approved',
        created_by: lecturerId,
        is_auto_generated: false
      },
      {
        topic: 'dynamic_programming',
        question_text: 'Active question',
        max_score: '20.00',
        status: 'active',
        created_by: lecturerId,
        is_auto_generated: true
      }
    ]).execute();

    const result = await getQuestions(lecturerId);

    // Should return all questions for lecturer
    expect(result).toHaveLength(3);
    
    // Verify numeric conversion
    expect(typeof result[0].max_score).toBe('number');
    expect(result[0].max_score).toEqual(10);
    expect(result[1].max_score).toEqual(15.5);
    expect(result[2].max_score).toEqual(20);

    // Verify all statuses are included
    const statuses = result.map(q => q.status).sort();
    expect(statuses).toEqual(['active', 'approved', 'draft']);
  });

  it('should return only approved and active questions when no lecturerId provided', async () => {
    // Create a lecturer user
    const lecturerResult = await db.insert(usersTable).values({
      name: 'Test Lecturer',
      username: 'lecturer1',
      password_hash: 'hashedpass',
      role: 'lecturer'
    }).returning().execute();
    const lecturerId = lecturerResult[0].id;

    // Create questions with different statuses
    await db.insert(questionsTable).values([
      {
        topic: 'monte_carlo',
        question_text: 'Draft question',
        max_score: '10.00',
        status: 'draft',
        created_by: lecturerId,
        is_auto_generated: false
      },
      {
        topic: 'markov_chain',
        question_text: 'Approved question',
        max_score: '15.50',
        status: 'approved',
        created_by: lecturerId,
        is_auto_generated: false
      },
      {
        topic: 'dynamic_programming',
        question_text: 'Active question',
        max_score: '20.00',
        status: 'active',
        created_by: lecturerId,
        is_auto_generated: true
      }
    ]).execute();

    const result = await getQuestions();

    // Should return only approved and active questions for students
    expect(result).toHaveLength(2);
    
    // Verify only approved and active statuses
    const statuses = result.map(q => q.status).sort();
    expect(statuses).toEqual(['active', 'approved']);
    
    // Verify no draft questions
    expect(result.some(q => q.status === 'draft')).toBe(false);
  });

  it('should return empty array when no questions exist', async () => {
    const result = await getQuestions();
    expect(result).toHaveLength(0);
  });

  it('should handle questions with all required fields correctly', async () => {
    // Create a lecturer user
    const lecturerResult = await db.insert(usersTable).values({
      name: 'Test Lecturer',
      username: 'lecturer1',
      password_hash: 'hashedpass',
      role: 'lecturer'
    }).returning().execute();
    const lecturerId = lecturerResult[0].id;

    // Create a question with all fields
    await db.insert(questionsTable).values({
      topic: 'game_theory',
      question_text: 'Complete question with answer key',
      answer_key: 'Sample answer key',
      max_score: '25.75',
      status: 'approved',
      created_by: lecturerId,
      is_auto_generated: true
    }).execute();

    const result = await getQuestions();

    expect(result).toHaveLength(1);
    const question = result[0];
    
    expect(question.topic).toEqual('game_theory');
    expect(question.question_text).toEqual('Complete question with answer key');
    expect(question.answer_key).toEqual('Sample answer key');
    expect(question.max_score).toEqual(25.75);
    expect(question.status).toEqual('approved');
    expect(question.is_auto_generated).toBe(true);
    expect(question.created_by).toEqual(lecturerId);
    expect(question.id).toBeDefined();
    expect(question.created_at).toBeInstanceOf(Date);
    expect(question.updated_at).toBeInstanceOf(Date);
  });
});
