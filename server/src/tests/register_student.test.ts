
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type StudentRegistrationInput } from '../schema';
import { registerStudent } from '../handlers/register_student';
import { eq } from 'drizzle-orm';

// Test input
const testInput: StudentRegistrationInput = {
  name: 'John Doe',
  nim: '12345678',
  attendance_number: 'A001',
  username: 'johndoe',
  password: 'password123',
  password_confirmation: 'password123'
};

describe('registerStudent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should register a new student', async () => {
    const result = await registerStudent(testInput);

    // Basic field validation
    expect(result.name).toEqual('John Doe');
    expect(result.nim).toEqual('12345678');
    expect(result.attendance_number).toEqual('A001');
    expect(result.username).toEqual('johndoe');
    expect(result.role).toEqual('student');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('password123'); // Should be hashed
  });

  it('should save student to database', async () => {
    const result = await registerStudent(testInput);

    // Query database to verify record was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].name).toEqual('John Doe');
    expect(users[0].nim).toEqual('12345678');
    expect(users[0].attendance_number).toEqual('A001');
    expect(users[0].username).toEqual('johndoe');
    expect(users[0].role).toEqual('student');
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should hash the password', async () => {
    const result = await registerStudent(testInput);

    // Verify password is hashed using Bun's password verification
    const isValid = await Bun.password.verify('password123', result.password_hash);
    expect(isValid).toBe(true);

    // Verify wrong password fails
    const isInvalid = await Bun.password.verify('wrongpassword', result.password_hash);
    expect(isInvalid).toBe(false);
  });

  it('should reject duplicate username', async () => {
    // Register first student
    await registerStudent(testInput);

    // Try to register another student with same username
    const duplicateInput = {
      ...testInput,
      nim: '87654321',
      attendance_number: 'A002'
    };

    expect(registerStudent(duplicateInput)).rejects.toThrow(/username already exists/i);
  });

  it('should reject duplicate NIM', async () => {
    // Register first student
    await registerStudent(testInput);

    // Try to register another student with same NIM
    const duplicateInput = {
      ...testInput,
      username: 'janedoe',
      attendance_number: 'A002'
    };

    expect(registerStudent(duplicateInput)).rejects.toThrow(/nim already exists/i);
  });

  it('should reject duplicate attendance number', async () => {
    // Register first student
    await registerStudent(testInput);

    // Try to register another student with same attendance number
    const duplicateInput = {
      ...testInput,
      username: 'janedoe',
      nim: '87654321'
    };

    expect(registerStudent(duplicateInput)).rejects.toThrow(/attendance number already exists/i);
  });

  it('should allow different students with unique identifiers', async () => {
    // Register first student
    const result1 = await registerStudent(testInput);

    // Register second student with different identifiers
    const secondInput: StudentRegistrationInput = {
      name: 'Jane Smith',
      nim: '87654321',
      attendance_number: 'A002',
      username: 'janesmith',
      password: 'password456',
      password_confirmation: 'password456'
    };

    const result2 = await registerStudent(secondInput);

    // Both should be created successfully
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.username).toEqual('johndoe');
    expect(result2.username).toEqual('janesmith');

    // Verify both exist in database
    const users = await db.select()
      .from(usersTable)
      .execute();

    expect(users).toHaveLength(2);
  });
});
