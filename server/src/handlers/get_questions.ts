
import { db } from '../db';
import { questionsTable } from '../db/schema';
import { type Question } from '../schema';
import { eq, or } from 'drizzle-orm';

export async function getQuestions(lecturerId?: number): Promise<Question[]> {
  try {
    // If no lecturerId provided, only return approved/active questions (for students)
    if (!lecturerId) {
      const results = await db.select()
        .from(questionsTable)
        .where(
          or(
            eq(questionsTable.status, 'approved'),
            eq(questionsTable.status, 'active')
          )
        )
        .execute();

      // Convert numeric fields back to numbers
      return results.map(question => ({
        ...question,
        max_score: parseFloat(question.max_score)
      }));
    }

    // If lecturerId provided, return all questions (for lecturer view)
    const results = await db.select()
      .from(questionsTable)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(question => ({
      ...question,
      max_score: parseFloat(question.max_score)
    }));
  } catch (error) {
    console.error('Failed to fetch questions:', error);
    throw error;
  }
}
