
import { db } from '../db';
import { questionsTable } from '../db/schema';
import { type UpdateQuestionInput, type Question } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updateQuestion = async (input: UpdateQuestionInput, lecturerId: number): Promise<Question> => {
  try {
    // First, verify the question exists and belongs to the lecturer
    const existingQuestion = await db.select()
      .from(questionsTable)
      .where(
        and(
          eq(questionsTable.id, input.id),
          eq(questionsTable.created_by, lecturerId)
        )
      )
      .execute();

    if (existingQuestion.length === 0) {
      throw new Error('Question not found or access denied');
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.topic !== undefined) {
      updateData.topic = input.topic;
    }
    if (input.question_text !== undefined) {
      updateData.question_text = input.question_text;
    }
    if (input.answer_key !== undefined) {
      updateData.answer_key = input.answer_key;
    }
    if (input.max_score !== undefined) {
      updateData.max_score = input.max_score.toString(); // Convert number to string for numeric column
    }
    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    // Update the question
    const result = await db.update(questionsTable)
      .set(updateData)
      .where(eq(questionsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const updatedQuestion = result[0];
    return {
      ...updatedQuestion,
      max_score: parseFloat(updatedQuestion.max_score) // Convert string back to number
    };
  } catch (error) {
    console.error('Question update failed:', error);
    throw error;
  }
};
