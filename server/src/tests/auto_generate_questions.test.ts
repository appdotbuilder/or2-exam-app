
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, questionsTable } from '../db/schema';
import { type AutoGenerateQuestionsInput } from '../schema';
import { autoGenerateQuestions } from '../handlers/auto_generate_questions';
import { eq } from 'drizzle-orm';

// Test lecturer user
const testLecturer = {
  name: 'Test Lecturer',
  nim: null,
  attendance_number: null,
  username: 'test_lecturer',
  password_hash: 'hashed_password',
  role: 'lecturer' as const
};

// Test input for auto-generating questions
const testInput: AutoGenerateQuestionsInput = {
  topic: 'monte_carlo',
  count: 3,
  max_score: 15
};

describe('autoGenerateQuestions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate the specified number of questions', async () => {
    // Create lecturer first
    const lecturerResult = await db.insert(usersTable)
      .values(testLecturer)
      .returning()
      .execute();
    const lecturerId = lecturerResult[0].id;

    const result = await autoGenerateQuestions(testInput, lecturerId);

    expect(result).toHaveLength(3);
    expect(result[0].topic).toEqual('monte_carlo');
    expect(result[0].max_score).toEqual(15);
    expect(result[0].status).toEqual('draft');
    expect(result[0].is_auto_generated).toBe(true);
    expect(result[0].created_by).toEqual(lecturerId);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should save questions to database', async () => {
    // Create lecturer first
    const lecturerResult = await db.insert(usersTable)
      .values(testLecturer)
      .returning()
      .execute();
    const lecturerId = lecturerResult[0].id;

    const result = await autoGenerateQuestions(testInput, lecturerId);

    // Verify questions are saved in database
    const savedQuestions = await db.select()
      .from(questionsTable)
      .where(eq(questionsTable.created_by, lecturerId))
      .execute();

    expect(savedQuestions).toHaveLength(3);
    savedQuestions.forEach(question => {
      expect(question.topic).toEqual('monte_carlo');
      expect(parseFloat(question.max_score)).toEqual(15);
      expect(question.status).toEqual('draft');
      expect(question.is_auto_generated).toBe(true);
      expect(question.answer_key).toBeNull();
      expect(question.question_text).toBeTruthy();
      expect(question.question_text.length).toBeGreaterThan(10);
    });
  });

  it('should generate questions for different topics', async () => {
    // Create lecturer first
    const lecturerResult = await db.insert(usersTable)
      .values(testLecturer)
      .returning()
      .execute();
    const lecturerId = lecturerResult[0].id;

    const gameTheoryInput: AutoGenerateQuestionsInput = {
      topic: 'game_theory',
      count: 2,
      max_score: 20
    };

    const result = await autoGenerateQuestions(gameTheoryInput, lecturerId);

    expect(result).toHaveLength(2);
    expect(result[0].topic).toEqual('game_theory');
    expect(result[0].max_score).toEqual(20);
    expect(result[0].question_text).toMatch(/Nash equilibrium|strategies|payoff|auction|prisoner's dilemma/i);
  });

  it('should generate unique question texts', async () => {
    // Create lecturer first
    const lecturerResult = await db.insert(usersTable)
      .values(testLecturer)
      .returning()
      .execute();
    const lecturerId = lecturerResult[0].id;

    const largerInput: AutoGenerateQuestionsInput = {
      topic: 'dynamic_programming',
      count: 5,
      max_score: 10
    };

    const result = await autoGenerateQuestions(largerInput, lecturerId);

    // Check that all question texts are different
    const questionTexts = result.map(q => q.question_text);
    const uniqueTexts = new Set(questionTexts);
    
    // With random values, questions should be unique
    expect(uniqueTexts.size).toBeGreaterThan(1);
    
    // All questions should contain topic-relevant keywords
    questionTexts.forEach(text => {
      expect(text.toLowerCase()).toMatch(/dynamic programming|knapsack|optimal|cost|path|inventory/);
    });
  });

  it('should handle different max_score values correctly', async () => {
    // Create lecturer first
    const lecturerResult = await db.insert(usersTable)
      .values(testLecturer)
      .returning()
      .execute();
    const lecturerId = lecturerResult[0].id;

    const customScoreInput: AutoGenerateQuestionsInput = {
      topic: 'markov_chain',
      count: 1,
      max_score: 25
    };

    const result = await autoGenerateQuestions(customScoreInput, lecturerId);

    expect(result[0].max_score).toEqual(25);
    expect(typeof result[0].max_score).toBe('number');
    
    // Verify in database as well
    const savedQuestion = await db.select()
      .from(questionsTable)
      .where(eq(questionsTable.id, result[0].id))
      .execute();
    
    expect(parseFloat(savedQuestion[0].max_score)).toEqual(25);
  });
});
