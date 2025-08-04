
import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['student', 'lecturer']);
export type UserRole = z.infer<typeof userRoleSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  nim: z.string().nullable(), // Only for students
  attendance_number: z.string().nullable(), // Only for students
  username: z.string(),
  password_hash: z.string(),
  role: userRoleSchema,
  created_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Question status enum
export const questionStatusSchema = z.enum(['draft', 'approved', 'active']);
export type QuestionStatus = z.infer<typeof questionStatusSchema>;

// Question topic enum
export const questionTopicSchema = z.enum([
  'monte_carlo',
  'markov_chain', 
  'dynamic_programming',
  'project_network_analysis',
  'game_theory'
]);
export type QuestionTopic = z.infer<typeof questionTopicSchema>;

// Question schema
export const questionSchema = z.object({
  id: z.number(),
  topic: questionTopicSchema,
  question_text: z.string(),
  answer_key: z.string().nullable(),
  max_score: z.number(),
  status: questionStatusSchema,
  is_auto_generated: z.boolean(),
  created_by: z.number(), // lecturer user id
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Question = z.infer<typeof questionSchema>;

// Exam session schema
export const examSessionSchema = z.object({
  id: z.number(),
  student_id: z.number(),
  started_at: z.coerce.date(),
  ended_at: z.coerce.date().nullable(),
  duration_minutes: z.number(),
  is_active: z.boolean(),
  created_at: z.coerce.date()
});

export type ExamSession = z.infer<typeof examSessionSchema>;

// Student answer schema
export const studentAnswerSchema = z.object({
  id: z.number(),
  session_id: z.number(),
  question_id: z.number(),
  answer_text: z.string().nullable(),
  attachment_path: z.string().nullable(),
  score: z.number().nullable(),
  graded_by: z.number().nullable(), // lecturer user id
  graded_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type StudentAnswer = z.infer<typeof studentAnswerSchema>;

// Student registration input
export const studentRegistrationInputSchema = z.object({
  name: z.string().min(1),
  nim: z.string().min(1),
  attendance_number: z.string().min(1),
  username: z.string().min(3),
  password: z.string().min(6),
  password_confirmation: z.string().min(6)
}).refine(data => data.password === data.password_confirmation, {
  message: "Passwords don't match",
  path: ["password_confirmation"]
});

export type StudentRegistrationInput = z.infer<typeof studentRegistrationInputSchema>;

// Login input
export const loginInputSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Create question input
export const createQuestionInputSchema = z.object({
  topic: questionTopicSchema,
  question_text: z.string().min(1),
  answer_key: z.string().nullable(),
  max_score: z.number().positive(),
  is_auto_generated: z.boolean().default(false)
});

export type CreateQuestionInput = z.infer<typeof createQuestionInputSchema>;

// Update question input
export const updateQuestionInputSchema = z.object({
  id: z.number(),
  topic: questionTopicSchema.optional(),
  question_text: z.string().min(1).optional(),
  answer_key: z.string().nullable().optional(),
  max_score: z.number().positive().optional(),
  status: questionStatusSchema.optional()
});

export type UpdateQuestionInput = z.infer<typeof updateQuestionInputSchema>;

// Start exam input
export const startExamInputSchema = z.object({
  student_id: z.number()
});

export type StartExamInput = z.infer<typeof startExamInputSchema>;

// Submit answer input
export const submitAnswerInputSchema = z.object({
  session_id: z.number(),
  question_id: z.number(),
  answer_text: z.string().nullable(),
  attachment_path: z.string().nullable()
});

export type SubmitAnswerInput = z.infer<typeof submitAnswerInputSchema>;

// Grade answer input
export const gradeAnswerInputSchema = z.object({
  answer_id: z.number(),
  score: z.number().min(0),
  graded_by: z.number()
});

export type GradeAnswerInput = z.infer<typeof gradeAnswerInputSchema>;

// Auto-generate questions input
export const autoGenerateQuestionsInputSchema = z.object({
  topic: questionTopicSchema,
  count: z.number().int().min(1).max(10),
  max_score: z.number().positive().default(10)
});

export type AutoGenerateQuestionsInput = z.infer<typeof autoGenerateQuestionsInputSchema>;
