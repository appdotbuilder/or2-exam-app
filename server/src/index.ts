
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schema types
import { 
  studentRegistrationInputSchema,
  loginInputSchema,
  createQuestionInputSchema,
  updateQuestionInputSchema,
  startExamInputSchema,
  submitAnswerInputSchema,
  gradeAnswerInputSchema,
  autoGenerateQuestionsInputSchema
} from './schema';

// Import handlers
import { registerStudent } from './handlers/register_student';
import { loginUser } from './handlers/login_user';
import { createQuestion } from './handlers/create_question';
import { getQuestions } from './handlers/get_questions';
import { updateQuestion } from './handlers/update_question';
import { approveQuestion } from './handlers/approve_question';
import { autoGenerateQuestions } from './handlers/auto_generate_questions';
import { startExam } from './handlers/start_exam';
import { getExamSession } from './handlers/get_exam_session';
import { endExam } from './handlers/end_exam';
import { submitAnswer } from './handlers/submit_answer';
import { getStudentAnswers } from './handlers/get_student_answers';
import { getAllStudentAnswers } from './handlers/get_all_student_answers';
import { gradeAnswer } from './handlers/grade_answer';
import { getExamInstructions } from './handlers/get_exam_instructions';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  registerStudent: publicProcedure
    .input(studentRegistrationInputSchema)
    .mutation(({ input }) => registerStudent(input)),

  loginUser: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),

  // Question management routes (lecturer)
  createQuestion: publicProcedure
    .input(createQuestionInputSchema.extend({ lecturerId: z.number() }))
    .mutation(({ input }) => {
      const { lecturerId, ...questionData } = input;
      return createQuestion(questionData, lecturerId);
    }),

  getQuestions: publicProcedure
    .input(z.object({ lecturerId: z.number().optional() }))
    .query(({ input }) => getQuestions(input.lecturerId)),

  updateQuestion: publicProcedure
    .input(updateQuestionInputSchema.extend({ lecturerId: z.number() }))
    .mutation(({ input }) => {
      const { lecturerId, ...questionData } = input;
      return updateQuestion(questionData, lecturerId);
    }),

  approveQuestion: publicProcedure
    .input(z.object({ questionId: z.number(), lecturerId: z.number() }))
    .mutation(({ input }) => approveQuestion(input.questionId, input.lecturerId)),

  autoGenerateQuestions: publicProcedure
    .input(autoGenerateQuestionsInputSchema.extend({ lecturerId: z.number() }))
    .mutation(({ input }) => {
      const { lecturerId, ...generateData } = input;
      return autoGenerateQuestions(generateData, lecturerId);
    }),

  // Exam session routes
  startExam: publicProcedure
    .input(startExamInputSchema)
    .mutation(({ input }) => startExam(input)),

  getExamSession: publicProcedure
    .input(z.object({ studentId: z.number() }))
    .query(({ input }) => getExamSession(input.studentId)),

  endExam: publicProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(({ input }) => endExam(input.sessionId)),

  getExamInstructions: publicProcedure
    .query(() => getExamInstructions()),

  // Answer submission routes
  submitAnswer: publicProcedure
    .input(submitAnswerInputSchema)
    .mutation(({ input }) => submitAnswer(input)),

  getStudentAnswers: publicProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(({ input }) => getStudentAnswers(input.sessionId)),

  // Lecturer grading routes
  getAllStudentAnswers: publicProcedure
    .input(z.object({ lecturerId: z.number() }))
    .query(({ input }) => getAllStudentAnswers(input.lecturerId)),

  gradeAnswer: publicProcedure
    .input(gradeAnswerInputSchema)
    .mutation(({ input }) => gradeAnswer(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
