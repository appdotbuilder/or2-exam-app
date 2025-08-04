
import { db } from '../db';
import { studentAnswersTable } from '../db/schema';
import { type SubmitAnswerInput, type StudentAnswer } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function submitAnswer(input: SubmitAnswerInput): Promise<StudentAnswer> {
  try {
    // Check if answer already exists for this question in the session
    const existingAnswers = await db.select()
      .from(studentAnswersTable)
      .where(
        and(
          eq(studentAnswersTable.session_id, input.session_id),
          eq(studentAnswersTable.question_id, input.question_id)
        )
      )
      .execute();

    const now = new Date();

    if (existingAnswers.length > 0) {
      // Update existing answer
      const result = await db.update(studentAnswersTable)
        .set({
          answer_text: input.answer_text,
          attachment_path: input.attachment_path,
          updated_at: now
        })
        .where(eq(studentAnswersTable.id, existingAnswers[0].id))
        .returning()
        .execute();

      const updatedAnswer = result[0];
      return {
        ...updatedAnswer,
        score: updatedAnswer.score ? parseFloat(updatedAnswer.score) : null
      };
    } else {
      // Create new answer record
      const result = await db.insert(studentAnswersTable)
        .values({
          session_id: input.session_id,
          question_id: input.question_id,
          answer_text: input.answer_text,
          attachment_path: input.attachment_path,
          created_at: now,
          updated_at: now
        })
        .returning()
        .execute();

      const newAnswer = result[0];
      return {
        ...newAnswer,
        score: newAnswer.score ? parseFloat(newAnswer.score) : null
      };
    }
  } catch (error) {
    console.error('Answer submission failed:', error);
    throw error;
  }
}
