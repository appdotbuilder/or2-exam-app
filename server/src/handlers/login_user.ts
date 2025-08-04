
import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type LoginInput, type User } from '../schema';

export async function loginUser(input: LoginInput): Promise<User | null> {
  try {
    // Handle special case for lecturer account
    if (input.username === 'buama' && input.password === 't42k1r0h') {
      // Check if lecturer account exists in database
      const existingLecturer = await db.select()
        .from(usersTable)
        .where(eq(usersTable.username, 'buama'))
        .execute();

      if (existingLecturer.length > 0) {
        return existingLecturer[0];
      }

      // Create lecturer account if it doesn't exist
      const lecturerResult = await db.insert(usersTable)
        .values({
          name: 'Bu Ama',
          nim: null,
          attendance_number: null,
          username: 'buama',
          password_hash: 'lecturer_hash', // Special hash for lecturer
          role: 'lecturer'
        })
        .returning()
        .execute();

      return lecturerResult[0];
    }

    // Find user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (users.length === 0) {
      return null;
    }

    const user = users[0];

    // For regular users, verify password hash
    // In a real implementation, you would use bcrypt.compare or similar
    // For now, we'll do a simple comparison (not secure for production)
    if (user.password_hash !== input.password) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}
