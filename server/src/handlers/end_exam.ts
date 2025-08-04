
import { db } from '../db';
import { examSessionsTable } from '../db/schema';
import { type ExamSession } from '../schema';
import { eq } from 'drizzle-orm';

export async function endExam(sessionId: number): Promise<ExamSession> {
  try {
    // Update the exam session to end it
    const result = await db.update(examSessionsTable)
      .set({
        ended_at: new Date(),
        is_active: false
      })
      .where(eq(examSessionsTable.id, sessionId))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Exam session with id ${sessionId} not found`);
    }

    // Return the updated exam session
    const session = result[0];
    return {
      ...session,
      duration_minutes: session.duration_minutes // Integer column - no conversion needed
    };
  } catch (error) {
    console.error('End exam failed:', error);
    throw error;
  }
}
