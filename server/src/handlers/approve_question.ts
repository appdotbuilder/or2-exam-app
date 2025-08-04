
import { db } from '../db';
import { questionsTable } from '../db/schema';
import { type Question } from '../schema';
import { eq } from 'drizzle-orm';

export async function approveQuestion(questionId: number, lecturerId: number): Promise<Question> {
  try {
    // First, verify the question exists and is in draft status
    const existingQuestion = await db.select()
      .from(questionsTable)
      .where(eq(questionsTable.id, questionId))
      .execute();

    if (existingQuestion.length === 0) {
      throw new Error('Question not found');
    }

    const question = existingQuestion[0];

    if (question.status !== 'draft') {
      throw new Error('Only draft questions can be approved');
    }

    // Update the question status to approved and set updated_at
    const result = await db.update(questionsTable)
      .set({
        status: 'approved',
        updated_at: new Date()
      })
      .where(eq(questionsTable.id, questionId))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const approvedQuestion = result[0];
    return {
      ...approvedQuestion,
      max_score: parseFloat(approvedQuestion.max_score)
    };
  } catch (error) {
    console.error('Question approval failed:', error);
    throw error;
  }
}
