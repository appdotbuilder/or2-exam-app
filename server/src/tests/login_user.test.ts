
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { loginUser } from '../handlers/login_user';
import { eq } from 'drizzle-orm';

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('lecturer login', () => {
    it('should authenticate lecturer with special credentials', async () => {
      const input: LoginInput = {
        username: 'buama',
        password: 't42k1r0h'
      };

      const result = await loginUser(input);

      expect(result).not.toBeNull();
      expect(result!.username).toEqual('buama');
      expect(result!.name).toEqual('Bu Ama');
      expect(result!.role).toEqual('lecturer');
      expect(result!.nim).toBeNull();
      expect(result!.attendance_number).toBeNull();
      expect(result!.id).toBeDefined();
      expect(result!.created_at).toBeInstanceOf(Date);
    });

    it('should create lecturer account if it does not exist', async () => {
      const input: LoginInput = {
        username: 'buama',
        password: 't42k1r0h'
      };

      // Verify no lecturer exists initially
      const initialUsers = await db.select()
        .from(usersTable)
        .where(eq(usersTable.username, 'buama'))
        .execute();
      expect(initialUsers).toHaveLength(0);

      const result = await loginUser(input);

      // Verify lecturer was created
      expect(result).not.toBeNull();
      expect(result!.role).toEqual('lecturer');

      // Verify lecturer exists in database
      const createdUsers = await db.select()
        .from(usersTable)
        .where(eq(usersTable.username, 'buama'))
        .execute();
      expect(createdUsers).toHaveLength(1);
      expect(createdUsers[0].role).toEqual('lecturer');
    });

    it('should use existing lecturer account if it exists', async () => {
      // Create lecturer account first
      await db.insert(usersTable)
        .values({
          name: 'Existing Lecturer',
          nim: null,
          attendance_number: null,
          username: 'buama',
          password_hash: 'existing_hash',
          role: 'lecturer'
        })
        .execute();

      const input: LoginInput = {
        username: 'buama',
        password: 't42k1r0h'
      };

      const result = await loginUser(input);

      expect(result).not.toBeNull();
      expect(result!.name).toEqual('Existing Lecturer');
      expect(result!.password_hash).toEqual('existing_hash');
      expect(result!.role).toEqual('lecturer');

      // Verify only one lecturer account exists
      const allLecturers = await db.select()
        .from(usersTable)
        .where(eq(usersTable.username, 'buama'))
        .execute();
      expect(allLecturers).toHaveLength(1);
    });

    it('should reject invalid lecturer password', async () => {
      const input: LoginInput = {
        username: 'buama',
        password: 'wrong_password'
      };

      const result = await loginUser(input);

      expect(result).toBeNull();
    });
  });

  describe('student login', () => {
    beforeEach(async () => {
      // Create test student
      await db.insert(usersTable)
        .values({
          name: 'Test Student',
          nim: '12345678',
          attendance_number: 'A001',
          username: 'student123',
          password_hash: 'student_password',
          role: 'student'
        })
        .execute();
    });

    it('should authenticate valid student credentials', async () => {
      const input: LoginInput = {
        username: 'student123',
        password: 'student_password'
      };

      const result = await loginUser(input);

      expect(result).not.toBeNull();
      expect(result!.username).toEqual('student123');
      expect(result!.name).toEqual('Test Student');
      expect(result!.role).toEqual('student');
      expect(result!.nim).toEqual('12345678');
      expect(result!.attendance_number).toEqual('A001');
      expect(result!.id).toBeDefined();
      expect(result!.created_at).toBeInstanceOf(Date);
    });

    it('should reject invalid student password', async () => {
      const input: LoginInput = {
        username: 'student123',
        password: 'wrong_password'
      };

      const result = await loginUser(input);

      expect(result).toBeNull();
    });

    it('should reject non-existent username', async () => {
      const input: LoginInput = {
        username: 'nonexistent',
        password: 'any_password'
      };

      const result = await loginUser(input);

      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle empty credentials', async () => {
      const input: LoginInput = {
        username: '',
        password: ''
      };

      const result = await loginUser(input);

      expect(result).toBeNull();
    });

    it('should handle username case sensitivity', async () => {
      // Create test user
      await db.insert(usersTable)
        .values({
          name: 'Case Test',
          nim: null,
          attendance_number: null,
          username: 'CaseTest',
          password_hash: 'test_password',
          role: 'student'
        })
        .execute();

      const input: LoginInput = {
        username: 'casetest', // Different case
        password: 'test_password'
      };

      const result = await loginUser(input);

      expect(result).toBeNull(); // Should not match due to case sensitivity
    });
  });
});
