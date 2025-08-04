
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type StudentRegistrationInput, type User } from '../schema';
import { eq, or } from 'drizzle-orm';

export async function registerStudent(input: StudentRegistrationInput): Promise<User> {
  try {
    // Check if username, NIM, or attendance_number already exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(
        or(
          eq(usersTable.username, input.username),
          eq(usersTable.nim, input.nim),
          eq(usersTable.attendance_number, input.attendance_number)
        )
      )
      .execute();

    if (existingUsers.length > 0) {
      const existing = existingUsers[0];
      if (existing.username === input.username) {
        throw new Error('Username already exists');
      }
      if (existing.nim === input.nim) {
        throw new Error('NIM already exists');
      }
      if (existing.attendance_number === input.attendance_number) {
        throw new Error('Attendance number already exists');
      }
    }

    // Hash the password (simple hash for this implementation)
    const passwordHash = await Bun.password.hash(input.password);

    // Create new user record
    const result = await db.insert(usersTable)
      .values({
        name: input.name,
        nim: input.nim,
        attendance_number: input.attendance_number,
        username: input.username,
        password_hash: passwordHash,
        role: 'student'
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Student registration failed:', error);
    throw error;
  }
}
