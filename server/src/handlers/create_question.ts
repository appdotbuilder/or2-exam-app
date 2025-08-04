
import { db } from '../db';
import { questionsTable, usersTable } from '../db/schema';
import { type CreateQuestionInput, type Question } from '../schema';
import { eq } from 'drizzle-orm';

export async function createQuestion(input: CreateQuestionInput, lecturerId: number): Promise<Question> {
  try {
    // Validate that the creator is a lecturer
    const lecturer = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, lecturerId))
      .execute();

    if (lecturer.length === 0) {
      throw new Error('Lecturer not found');
    }

    if (lecturer[0].role !== 'lecturer') {
      throw new Error('Only lecturers can create questions');
    }

    // Create question with 'draft' status initially
    const result = await db.insert(questionsTable)
      .values({
        topic: input.topic,
        question_text: input.question_text,
        answer_key: input.answer_key,
        max_score: input.max_score.toString(), // Convert number to string for numeric column
        status: 'draft',
        is_auto_generated: input.is_auto_generated,
        created_by: lecturerId
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const question = result[0];
    return {
      ...question,
      max_score: parseFloat(question.max_score) // Convert string back to number
    };
  } catch (error) {
    console.error('Question creation failed:', error);
    throw error;
  }
}
