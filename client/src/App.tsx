
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { 
  User, 
  LoginInput, 
  StudentRegistrationInput,
  Question,
  ExamSession,
  StudentAnswer,
  SubmitAnswerInput
} from '../../server/src/schema';
import type { ExamInstructions } from '../../server/src/handlers/get_exam_instructions';

// Components
import { AuthForm } from './components/AuthForm';
import { LecturerDashboard } from './components/LecturerDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { ExamInterface } from './components/ExamInterface';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'auth' | 'dashboard' | 'exam'>('auth');
  const [activeSession, setActiveSession] = useState<ExamSession | null>(null);
  const [examInstructions, setExamInstructions] = useState<ExamInstructions | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [studentAnswers, setStudentAnswers] = useState<StudentAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load exam instructions on mount
  const loadExamInstructions = useCallback(async () => {
    try {
      const instructions = await trpc.getExamInstructions.query();
      setExamInstructions(instructions);
    } catch (error) {
      console.error('Failed to load exam instructions:', error);
    }
  }, []);

  useEffect(() => {
    loadExamInstructions();
  }, [loadExamInstructions]);

  // Check for active exam session when student logs in
  const checkActiveSession = useCallback(async (studentId: number) => {
    try {
      const session = await trpc.getExamSession.query({ studentId });
      setActiveSession(session);
      if (session && session.is_active) {
        setCurrentView('exam');
        // Load questions and answers for active session
        const [questionsData, answersData] = await Promise.all([
          trpc.getQuestions.query({}),
          trpc.getStudentAnswers.query({ sessionId: session.id })
        ]);
        setQuestions(questionsData);
        setStudentAnswers(answersData);
      }
    } catch (error) {
      console.error('Failed to check active session:', error);
    }
  }, []);

  const handleLogin = async (loginData: LoginInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const userData = await trpc.loginUser.mutate(loginData);
      if (userData) {
        setUser(userData);
        if (userData.role === 'student') {
          await checkActiveSession(userData.id);
          if (!activeSession) {
            setCurrentView('dashboard');
          }
        } else {
          setCurrentView('dashboard');
        }
      } else {
        setError('Invalid username or password');
      }
    } catch (error) {
      setError('Login failed. Please try again.');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (registerData: StudentRegistrationInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const userData = await trpc.registerStudent.mutate(registerData);
      setUser(userData);
      setCurrentView('dashboard');
    } catch (error) {
      setError('Registration failed. Please check your information and try again.');
      console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartExam = async () => {
    if (!user || user.role !== 'student') return;
    
    setIsLoading(true);
    setError(null);
    try {
      const session = await trpc.startExam.mutate({ student_id: user.id });
      setActiveSession(session);
      
      // Load questions for the exam
      const questionsData = await trpc.getQuestions.query({});
      setQuestions(questionsData);
      setStudentAnswers([]);
      
      setCurrentView('exam');
    } catch (error) {
      setError('Failed to start exam. Please try again.');
      console.error('Start exam error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndExam = async () => {
    if (!activeSession) return;
    
    setIsLoading(true);
    try {
      await trpc.endExam.mutate({ sessionId: activeSession.id });
      setActiveSession(null);
      setCurrentView('dashboard');
      setQuestions([]);
      setStudentAnswers([]);
    } catch (error) {
      console.error('End exam error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAnswer = async (answerData: SubmitAnswerInput) => {
    try {
      const submittedAnswer = await trpc.submitAnswer.mutate(answerData);
      setStudentAnswers((prev: StudentAnswer[]) => {
        const existing = prev.find(a => a.question_id === answerData.question_id);
        if (existing) {
          return prev.map(a => a.question_id === answerData.question_id ? submittedAnswer : a);
        }
        return [...prev, submittedAnswer];
      });
    } catch (error) {
      console.error('Submit answer error:', error);
      throw error;
    }
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('auth');
    setActiveSession(null);
    setQuestions([]);
    setStudentAnswers([]);
    setError(null);
  };

  if (currentView === 'auth') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-blue-900">
              📊 Operational Research 2
            </CardTitle>
            <p className="text-sm text-gray-600">Online Examination System</p>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="mb-4 border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}
            <AuthForm 
              onLogin={handleLogin}
              onRegister={handleRegister}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentView === 'exam' && user && activeSession) {
    return (
      <ExamInterface
        user={user}
        session={activeSession}
        questions={questions}
        studentAnswers={studentAnswers}
        onSubmitAnswer={handleSubmitAnswer}
        onEndExam={handleEndExam}
        examInstructions={examInstructions}
      />
    );
  }

  if (currentView === 'dashboard' && user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-semibold text-gray-900">
                  📊 Operational Research 2
                </h1>
                <Badge variant={user.role === 'lecturer' ? 'default' : 'secondary'}>
                  {user.role === 'lecturer' ? '👨‍🏫 Lecturer' : '👨‍🎓 Student'}
                </Badge>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  Welcome, {user.name}
                </span>
                <Button variant="outline" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {user.role === 'lecturer' ? (
            <LecturerDashboard user={user} />
          ) : (
            <StudentDashboard 
              user={user}
              onStartExam={handleStartExam}
              examInstructions={examInstructions}
              isLoading={isLoading}
            />
          )}
        </main>
      </div>
    );
  }

  return null;
}

export default App;
