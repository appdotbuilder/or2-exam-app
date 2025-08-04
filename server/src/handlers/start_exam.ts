
import { db } from '../db';
import { examSessionsTable, usersTable } from '../db/schema';
import { type StartExamInput, type ExamSession } from '../schema';
import { eq, and } from 'drizzle-orm';

export const startExam = async (input: StartExamInput): Promise<ExamSession> => {
  try {
    // Check if student exists and has student role
    const student = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.student_id))
      .execute();

    if (student.length === 0) {
      throw new Error('Student not found');
    }

    if (student[0].role !== 'student') {
      throw new Error('User is not a student');
    }

    // Check if student already has an active exam session
    const activeSession = await db.select()
      .from(examSessionsTable)
      .where(
        and(
          eq(examSessionsTable.student_id, input.student_id),
          eq(examSessionsTable.is_active, true)
        )
      )
      .execute();

    if (activeSession.length > 0) {
      throw new Error('Student already has an active exam session');
    }

    // Create new exam session
    const result = await db.insert(examSessionsTable)
      .values({
        student_id: input.student_id,
        duration_minutes: 30,
        is_active: true
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Start exam failed:', error);
    throw error;
  }
};
