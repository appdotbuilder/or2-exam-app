
import { db } from '../db';
import { studentAnswersTable } from '../db/schema';
import { type StudentAnswer } from '../schema';
import { eq } from 'drizzle-orm';

export async function getStudentAnswers(sessionId: number): Promise<StudentAnswer[]> {
  try {
    const results = await db.select()
      .from(studentAnswersTable)
      .where(eq(studentAnswersTable.session_id, sessionId))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(answer => ({
      ...answer,
      score: answer.score ? parseFloat(answer.score) : null
    }));
  } catch (error) {
    console.error('Get student answers failed:', error);
    throw error;
  }
}
