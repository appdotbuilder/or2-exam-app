
import { db } from '../db';
import { studentAnswersTable, usersTable, questionsTable, examSessionsTable } from '../db/schema';
import { type StudentAnswer } from '../schema';
import { eq } from 'drizzle-orm';

export async function getAllStudentAnswers(lecturerId: number): Promise<StudentAnswer[]> {
  try {
    // First validate that the requester is a lecturer
    const lecturer = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, lecturerId))
      .execute();

    if (lecturer.length === 0 || lecturer[0].role !== 'lecturer') {
      throw new Error('Unauthorized: Only lecturers can access all student answers');
    }

    // Get all student answers with joins to get comprehensive information
    const results = await db.select()
      .from(studentAnswersTable)
      .innerJoin(examSessionsTable, eq(studentAnswersTable.session_id, examSessionsTable.id))
      .innerJoin(usersTable, eq(examSessionsTable.student_id, usersTable.id))
      .innerJoin(questionsTable, eq(studentAnswersTable.question_id, questionsTable.id))
      .execute();

    // Convert the joined results to StudentAnswer format with numeric conversions
    return results.map(result => ({
      id: result.student_answers.id,
      session_id: result.student_answers.session_id,
      question_id: result.student_answers.question_id,
      answer_text: result.student_answers.answer_text,
      attachment_path: result.student_answers.attachment_path,
      score: result.student_answers.score ? parseFloat(result.student_answers.score) : null,
      graded_by: result.student_answers.graded_by,
      graded_at: result.student_answers.graded_at,
      created_at: result.student_answers.created_at,
      updated_at: result.student_answers.updated_at
    }));
  } catch (error) {
    console.error('Failed to get all student answers:', error);
    throw error;
  }
}
