
import { db } from '../db';
import { studentAnswersTable, usersTable } from '../db/schema';
import { type GradeAnswerInput, type StudentAnswer } from '../schema';
import { eq, and } from 'drizzle-orm';

export const gradeAnswer = async (input: GradeAnswerInput): Promise<StudentAnswer> => {
  try {
    // Validate that the grader is a lecturer
    const grader = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.graded_by))
      .execute();

    if (grader.length === 0) {
      throw new Error('Grader not found');
    }

    if (grader[0].role !== 'lecturer') {
      throw new Error('Only lecturers can grade answers');
    }

    // Check if the answer exists
    const existingAnswer = await db.select()
      .from(studentAnswersTable)
      .where(eq(studentAnswersTable.id, input.answer_id))
      .execute();

    if (existingAnswer.length === 0) {
      throw new Error('Answer not found');
    }

    // Update the answer with the provided score and grading information
    const result = await db.update(studentAnswersTable)
      .set({
        score: input.score.toString(), // Convert number to string for numeric column
        graded_by: input.graded_by,
        graded_at: new Date(),
        updated_at: new Date()
      })
      .where(eq(studentAnswersTable.id, input.answer_id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const answer = result[0];
    return {
      ...answer,
      score: answer.score ? parseFloat(answer.score) : null // Convert string back to number
    };
  } catch (error) {
    console.error('Answer grading failed:', error);
    throw error;
  }
};
