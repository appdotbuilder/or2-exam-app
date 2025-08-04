
import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum definitions
export const userRoleEnum = pgEnum('user_role', ['student', 'lecturer']);
export const questionStatusEnum = pgEnum('question_status', ['draft', 'approved', 'active']);
export const questionTopicEnum = pgEnum('question_topic', [
  'monte_carlo',
  'markov_chain', 
  'dynamic_programming',
  'project_network_analysis',
  'game_theory'
]);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  nim: text('nim'), // Nullable - only for students
  attendance_number: text('attendance_number'), // Nullable - only for students
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Questions table
export const questionsTable = pgTable('questions', {
  id: serial('id').primaryKey(),
  topic: questionTopicEnum('topic').notNull(),
  question_text: text('question_text').notNull(),
  answer_key: text('answer_key'), // Nullable
  max_score: numeric('max_score', { precision: 5, scale: 2 }).notNull(),
  status: questionStatusEnum('status').notNull().default('draft'),
  is_auto_generated: boolean('is_auto_generated').notNull().default(false),
  created_by: integer('created_by').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Exam sessions table
export const examSessionsTable = pgTable('exam_sessions', {
  id: serial('id').primaryKey(),
  student_id: integer('student_id').notNull().references(() => usersTable.id),
  started_at: timestamp('started_at').defaultNow().notNull(),
  ended_at: timestamp('ended_at'), // Nullable - null if exam is still active
  duration_minutes: integer('duration_minutes').notNull().default(30),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Student answers table
export const studentAnswersTable = pgTable('student_answers', {
  id: serial('id').primaryKey(),
  session_id: integer('session_id').notNull().references(() => examSessionsTable.id),
  question_id: integer('question_id').notNull().references(() => questionsTable.id),
  answer_text: text('answer_text'), // Nullable
  attachment_path: text('attachment_path'), // Nullable
  score: numeric('score', { precision: 5, scale: 2 }), // Nullable - null if not graded yet
  graded_by: integer('graded_by').references(() => usersTable.id), // Nullable
  graded_at: timestamp('graded_at'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  createdQuestions: many(questionsTable),
  examSessions: many(examSessionsTable),
  gradedAnswers: many(studentAnswersTable),
}));

export const questionsRelations = relations(questionsTable, ({ one, many }) => ({
  creator: one(usersTable, {
    fields: [questionsTable.created_by],
    references: [usersTable.id],
  }),
  studentAnswers: many(studentAnswersTable),
}));

export const examSessionsRelations = relations(examSessionsTable, ({ one, many }) => ({
  student: one(usersTable, {
    fields: [examSessionsTable.student_id],
    references: [usersTable.id],
  }),
  answers: many(studentAnswersTable),
}));

export const studentAnswersRelations = relations(studentAnswersTable, ({ one }) => ({
  session: one(examSessionsTable, {
    fields: [studentAnswersTable.session_id],
    references: [examSessionsTable.id],
  }),
  question: one(questionsTable, {
    fields: [studentAnswersTable.question_id],
    references: [questionsTable.id],
  }),
  gradedBy: one(usersTable, {
    fields: [studentAnswersTable.graded_by],
    references: [usersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Question = typeof questionsTable.$inferSelect;
export type NewQuestion = typeof questionsTable.$inferInsert;
export type ExamSession = typeof examSessionsTable.$inferSelect;
export type NewExamSession = typeof examSessionsTable.$inferInsert;
export type StudentAnswer = typeof studentAnswersTable.$inferSelect;
export type NewStudentAnswer = typeof studentAnswersTable.$inferInsert;

// Export all tables for proper query building
export const tables = { 
  users: usersTable, 
  questions: questionsTable,
  examSessions: examSessionsTable,
  studentAnswers: studentAnswersTable
};
