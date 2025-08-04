
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, questionsTable, examSessionsTable, studentAnswersTable } from '../db/schema';
import { getStudentAnswers } from '../handlers/get_student_answers';

describe('getStudentAnswers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no answers exist for session', async () => {
    const result = await getStudentAnswers(999);
    expect(result).toEqual([]);
  });

  it('should return student answers for a session', async () => {
    // Create test lecturer
    const lecturer = await db.insert(usersTable)
      .values({
        name: 'Test Lecturer',
        username: 'lecturer1',
        password_hash: 'hashed_password',
        role: 'lecturer'
      })
      .returning()
      .execute();

    // Create test student
    const student = await db.insert(usersTable)
      .values({
        name: 'Test Student',
        nim: '12345',
        attendance_number: '001',
        username: 'student1',
        password_hash: 'hashed_password',
        role: 'student'
      })
      .returning()
      .execute();

    // Create test question
    const question = await db.insert(questionsTable)
      .values({
        topic: 'monte_carlo',
        question_text: 'Test question?',
        answer_key: 'Test answer',
        max_score: '10.00',
        status: 'active',
        is_auto_generated: false,
        created_by: lecturer[0].id
      })
      .returning()
      .execute();

    // Create exam session
    const session = await db.insert(examSessionsTable)
      .values({
        student_id: student[0].id,
        duration_minutes: 30,
        is_active: true
      })
      .returning()
      .execute();

    // Create student answer
    const answerData = {
      session_id: session[0].id,
      question_id: question[0].id,
      answer_text: 'Student answer text',
      attachment_path: null,
      score: '8.50',
      graded_by: lecturer[0].id,
      graded_at: new Date()
    };

    await db.insert(studentAnswersTable)
      .values(answerData)
      .execute();

    const result = await getStudentAnswers(session[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].session_id).toEqual(session[0].id);
    expect(result[0].question_id).toEqual(question[0].id);
    expect(result[0].answer_text).toEqual('Student answer text');
    expect(result[0].attachment_path).toBeNull();
    expect(result[0].score).toEqual(8.5); // Should be converted to number
    expect(typeof result[0].score).toBe('number');
    expect(result[0].graded_by).toEqual(lecturer[0].id);
    expect(result[0].graded_at).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return multiple answers for a session', async () => {
    // Create test lecturer
    const lecturer = await db.insert(usersTable)
      .values({
        name: 'Test Lecturer',
        username: 'lecturer1',
        password_hash: 'hashed_password',
        role: 'lecturer'
      })
      .returning()
      .execute();

    // Create test student
    const student = await db.insert(usersTable)
      .values({
        name: 'Test Student',
        nim: '12345',
        attendance_number: '001',
        username: 'student1',
        password_hash: 'hashed_password',
        role: 'student'
      })
      .returning()
      .execute();

    // Create test questions
    const questions = await db.insert(questionsTable)
      .values([
        {
          topic: 'monte_carlo',
          question_text: 'Question 1?',
          answer_key: 'Answer 1',
          max_score: '10.00',
          status: 'active',
          is_auto_generated: false,
          created_by: lecturer[0].id
        },
        {
          topic: 'markov_chain',
          question_text: 'Question 2?',
          answer_key: 'Answer 2',
          max_score: '15.00',
          status: 'active',
          is_auto_generated: false,
          created_by: lecturer[0].id
        }
      ])
      .returning()
      .execute();

    // Create exam session
    const session = await db.insert(examSessionsTable)
      .values({
        student_id: student[0].id,
        duration_minutes: 30,
        is_active: true
      })
      .returning()
      .execute();

    // Create student answers
    await db.insert(studentAnswersTable)
      .values([
        {
          session_id: session[0].id,
          question_id: questions[0].id,
          answer_text: 'Answer to question 1',
          attachment_path: null,
          score: null, // Not graded yet
          graded_by: null,
          graded_at: null
        },
        {
          session_id: session[0].id,
          question_id: questions[1].id,
          answer_text: 'Answer to question 2',
          attachment_path: '/uploads/file.pdf',
          score: '12.75',
          graded_by: lecturer[0].id,
          graded_at: new Date()
        }
      ])
      .execute();

    const result = await getStudentAnswers(session[0].id);

    expect(result).toHaveLength(2);
    
    // Check first answer (not graded)
    const firstAnswer = result.find(a => a.question_id === questions[0].id);
    expect(firstAnswer).toBeDefined();
    expect(firstAnswer!.answer_text).toEqual('Answer to question 1');
    expect(firstAnswer!.score).toBeNull();
    expect(firstAnswer!.graded_by).toBeNull();
    expect(firstAnswer!.graded_at).toBeNull();

    // Check second answer (graded)
    const secondAnswer = result.find(a => a.question_id === questions[1].id);
    expect(secondAnswer).toBeDefined();
    expect(secondAnswer!.answer_text).toEqual('Answer to question 2');
    expect(secondAnswer!.attachment_path).toEqual('/uploads/file.pdf');
    expect(secondAnswer!.score).toEqual(12.75);
    expect(typeof secondAnswer!.score).toBe('number');
    expect(secondAnswer!.graded_by).toEqual(lecturer[0].id);
    expect(secondAnswer!.graded_at).toBeInstanceOf(Date);
  });

  it('should not return answers from other sessions', async () => {
    // Create test lecturer
    const lecturer = await db.insert(usersTable)
      .values({
        name: 'Test Lecturer',
        username: 'lecturer1',
        password_hash: 'hashed_password',
        role: 'lecturer'
      })
      .returning()
      .execute();

    // Create test students
    const students = await db.insert(usersTable)
      .values([
        {
          name: 'Student 1',
          nim: '12345',
          attendance_number: '001',
          username: 'student1',
          password_hash: 'hashed_password',
          role: 'student'
        },
        {
          name: 'Student 2',
          nim: '67890',
          attendance_number: '002',
          username: 'student2',
          password_hash: 'hashed_password',
          role: 'student'
        }
      ])
      .returning()
      .execute();

    // Create test question
    const question = await db.insert(questionsTable)
      .values({
        topic: 'monte_carlo',
        question_text: 'Test question?',
        answer_key: 'Test answer',
        max_score: '10.00',
        status: 'active',
        is_auto_generated: false,
        created_by: lecturer[0].id
      })
      .returning()
      .execute();

    // Create two exam sessions
    const sessions = await db.insert(examSessionsTable)
      .values([
        {
          student_id: students[0].id,
          duration_minutes: 30,
          is_active: true
        },
        {
          student_id: students[1].id,
          duration_minutes: 30,
          is_active: true
        }
      ])
      .returning()
      .execute();

    // Create answers for both sessions
    await db.insert(studentAnswersTable)
      .values([
        {
          session_id: sessions[0].id,
          question_id: question[0].id,
          answer_text: 'Answer from session 1',
          attachment_path: null,
          score: null,
          graded_by: null,
          graded_at: null
        },
        {
          session_id: sessions[1].id,
          question_id: question[0].id,
          answer_text: 'Answer from session 2',
          attachment_path: null,
          score: null,
          graded_by: null,
          graded_at: null
        }
      ])
      .execute();

    // Get answers for first session only
    const result = await getStudentAnswers(sessions[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].session_id).toEqual(sessions[0].id);
    expect(result[0].answer_text).toEqual('Answer from session 1');
  });
});
