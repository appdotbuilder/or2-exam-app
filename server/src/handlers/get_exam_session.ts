
import { db } from '../db';
import { examSessionsTable } from '../db/schema';
import { type ExamSession } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function getExamSession(studentId: number): Promise<ExamSession | null> {
  try {
    // Find the active exam session for the student
    const sessions = await db.select()
      .from(examSessionsTable)
      .where(
        and(
          eq(examSessionsTable.student_id, studentId),
          eq(examSessionsTable.is_active, true)
        )
      )
      .execute();

    if (sessions.length === 0) {
      return null;
    }

    const session = sessions[0];

    // Check if session has expired based on duration
    const now = new Date();
    const sessionStart = new Date(session.started_at);
    const sessionDurationMs = session.duration_minutes * 60 * 1000;
    const sessionEndTime = new Date(sessionStart.getTime() + sessionDurationMs);

    // If session has expired, mark it as inactive and set ended_at
    if (now > sessionEndTime && session.is_active) {
      await db.update(examSessionsTable)
        .set({
          is_active: false,
          ended_at: sessionEndTime
        })
        .where(eq(examSessionsTable.id, session.id))
        .execute();

      // Return the updated session data
      return {
        ...session,
        is_active: false,
        ended_at: sessionEndTime
      };
    }

    // Return the active session
    return session;
  } catch (error) {
    console.error('Failed to get exam session:', error);
    throw error;
  }
}
