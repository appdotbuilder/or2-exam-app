
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Clock, Save, Upload, AlertTriangle, CheckCircle } from 'lucide-react';
import type { 
  User, 
  ExamSession, 
  Question, 
  StudentAnswer,
  SubmitAnswerInput,
  QuestionTopic 
} from '../../../server/src/schema';
import type { ExamInstructions } from '../../../server/src/handlers/get_exam_instructions';

interface ExamInterfaceProps {
  user: User;
  session: ExamSession;
  questions: Question[];
  studentAnswers: StudentAnswer[];
  onSubmitAnswer: (answer: SubmitAnswerInput) => Promise<void>;
  onEndExam: () => Promise<void>;
  examInstructions: ExamInstructions | null;
}

export function ExamInterface({ 
  user, 
  session, 
  questions, 
  studentAnswers, 
  onSubmitAnswer, 
  onEndExam, 
  examInstructions 
}: ExamInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [questionId: number]: string }>({});
  const [attachments, setAttachments] = useState<{ [questionId: number]: File | null }>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ [questionId: number]: 'saved' | 'saving' | 'error' }>({});
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  // Calculate time remaining
  useEffect(() => {
    const calculateTimeRemaining = () => {
      const startTime = new Date(session.started_at).getTime();
      const endTime = startTime + (session.duration_minutes * 60 * 1000);
      const now = new Date().getTime();
      const remaining = Math.max(0, endTime - now);
      return Math.floor(remaining / 1000); // in seconds
    };

    setTimeRemaining(calculateTimeRemaining());

    const timer = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        // Auto-end exam when time expires
        onEndExam();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [session, onEndExam]);

  // Initialize answers from existing student answers
  useEffect(() => {
    const initialAnswers: { [questionId: number]: string } = {};
    studentAnswers.forEach((answer: StudentAnswer) => {
      initialAnswers[answer.question_id] = answer.answer_text || '';
    });
    setAnswers(initialAnswers);
  }, [studentAnswers]);

  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  const getTimeColor = useCallback(() => {
    if (timeRemaining > 600) return 'text-green-600'; // > 10 minutes
    if (timeRemaining > 300) return 'text-yellow-600'; // > 5 minutes
    return 'text-red-600'; // <= 5 minutes
  }, [timeRemaining]);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  const getTopicLabel = (topic: QuestionTopic) => {
    const labels = {
      monte_carlo: '🎲 Monte Carlo',
      markov_chain: '🔗 Markov Chain',
      dynamic_programming: '🧮 Dynamic Programming',
      project_network_analysis: '📊 Project Network',
      game_theory: '🎯 Game Theory'
    };
    return labels[topic];
  };

  const handleAnswerChange = (questionId: number, value: string) => {
    setAnswers((prev: { [questionId: number]: string }) => ({ ...prev, [questionId]: value }));
  };

  const handleFileChange = (questionId: number, file: File | null) => {
    setAttachments((prev: { [questionId: number]: File | null }) => ({ ...prev, [questionId]: file }));
  };

  const handleSaveAnswer = async (questionId: number) => {
    setIsSubmitting(true);
    setSubmitStatus((prev: { [questionId: number]: 'saved' | 'saving' | 'error' }) => 
      ({ ...prev, [questionId]: 'saving' })
    );

    try {
      const answerData: SubmitAnswerInput = {
        session_id: session.id,
        question_id: questionId,
        answer_text: answers[questionId] || null,
        attachment_path: attachments[questionId] ? attachments[questionId]!.name : null
      };

      await onSubmitAnswer(answerData);
      setSubmitStatus((prev: { [questionId: number]: 'saved' | 'saving' | 'error' }) => 
        ({ ...prev, [questionId]: 'saved' })
      );
      
      // Clear the saved status after 3 seconds
      setTimeout(() => {
        setSubmitStatus((prev: { [questionId: number]: 'saved' | 'saving' | 'error' }) => {
          const newStatus = { ...prev };
          delete newStatus[questionId];
          return newStatus;
        });
      }, 3000);
    } catch (error) {
      setSubmitStatus((prev: { [questionId: number]: 'saved' | 'saving' | 'error' }) => 
        ({ ...prev, [questionId]: 'error' })
      );
      console.error('Save answer error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAnsweredCount = () => {
    return questions.filter(q => answers[q.id] && answers[q.id].trim() !== '').length;
  };

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Questions Available</h2>
              <p className="text-gray-600 mb-4">
                There are currently no questions available for this exam.
              </p>
              <Button onClick={onEndExam}>Return to Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-lg font-semibold text-gray-900">
                📊 Operational Research 2 - Exam
              </h1>
              <Badge variant="secondary">
                {user.name} ({user.nim})
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 ${getTimeColor()}`}>
                <Clock className="h-5 w-5" />
                <span className="font-mono text-lg font-bold">
                  {formatTime(timeRemaining)}
                </span>
              </div>
              <Dialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
                    End Exam
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>End Exam Confirmation</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p>Are you sure you want to end the exam?</p>
                    <div className="bg-yellow-50 p-3 rounded-md">
                      <p className="text-sm text-yellow-800">
                        <strong>Answered:</strong> {getAnsweredCount()} of {questions.length} questions
                      </p>
                      <p className="text-sm text-yellow-800">
                        <strong>Time Remaining:</strong> {formatTime(timeRemaining)}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="destructive" 
                        onClick={() => {
                          setShowEndConfirm(false);
                          onEndExam();
                        }}
                      >
                        Yes, End Exam
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowEndConfirm(false)}
                      >
                        Continue Exam
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Question Navigation Sidebar */}
          <div className="col-span-3">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-sm">📋 Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{currentQuestionIndex + 1} of {questions.length}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
                
                <div className="grid grid-cols-2 gap-1">
                  {questions.map((question: Question, index: number) => {
                    const isAnswered = answers[question.id] && answers[question.id].trim() !== '';
                    const isCurrent = index === currentQuestionIndex;
                    
                    return (
                      <Button
                        key={question.id}
                        variant={isCurrent ? 'default' : 'outline'}
                        size="sm"
                        className={`h-8 text-xs ${
                          isAnswered 
                            ? 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200' 
                            : ''
                        }`}
                        onClick={() => setCurrentQuestionIndex(index)}
                      >
                        {index + 1}
                        {isAnswered && <CheckCircle className="h-3 w-3 ml-1" />}
                      </Button>
                    );
                  })}
                </div>

                <Separator />

                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>✅ Answered:</span>
                    <span>{getAnsweredCount()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>⏳ Remaining:</span>
                    <span>{questions.length - getAnsweredCount()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Question Area */}
          <div className="col-span-9">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline">
                        Question {currentQuestionIndex + 1} of {questions.length}
                      </Badge>
                      <Badge variant="secondary">
                        {getTopicLabel(currentQuestion.topic)}
                      </Badge>
                      <Badge variant="outline">
                        Max Score: {currentQuestion.max_score} pts
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {submitStatus[currentQuestion.id] === 'saving' && (
                      <Badge variant="secondary">💾 Saving...</Badge>
                    )}
                    {submitStatus[currentQuestion.id] === 'saved' && (
                      <Badge variant="default" className="bg-green-600">✅ Saved</Badge>
                    )}
                    {submitStatus[currentQuestion.id] === 'error' && (
                      <Badge variant="destructive">❌ Error</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Question Text */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">Question:</h3>
                  <p className="whitespace-pre-wrap text-blue-800">
                    {currentQuestion.question_text}
                  </p>
                </div>

                {/* Answer Input */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Your Answer:
                    </label>
                    <Textarea
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        handleAnswerChange(currentQuestion.id, e.target.value)
                      }
                      placeholder="Type your answer here..."
                      rows={8}
                      className="resize-none"
                    />
                  </div>

                  {/* File Attachment */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                      <Upload className="h-4 w-4" />
                      <span>Attach File (Optional):</span>
                    </label>
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files ? e.target.files[0] : null;
                        handleFileChange(currentQuestion.id, file);
                      }}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {attachments[currentQuestion.id] && (
                      <p className="text-sm text-green-600">
                        📎 {attachments[currentQuestion.id]!.name}
                      </p>
                    )}
                  </div>

                  {/* Save Button */}
                  <div className="flex items-center space-x-3">
                    <Button
                      onClick={() => handleSaveAnswer(currentQuestion.id)}
                      disabled={isSubmitting}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSubmitting ? 'Saving...' : 'Save Answer'}
                    </Button>
                    
                    <Alert className="flex-1 py-2">
                      <AlertDescription className="text-xs">
                        💡 Remember to save your answers periodically! Your progress is automatically saved when you click "Save Answer".
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                    disabled={currentQuestionIndex === 0}
                  >
                    ← Previous
                  </Button>
                  
                  <div className="text-sm text-gray-500 flex items-center">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                    disabled={currentQuestionIndex === questions.length - 1}
                  >
                    Next →
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Time Warning */}
            {timeRemaining <= 300 && timeRemaining > 0 && (
              <Alert className="mt-4 border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-red-800">
                  <strong>⚠️ Time Warning:</strong> Less than 5 minutes remaining! Make sure to save your answers.
                </AlertDescription>
              </Alert>
            )}

            {/* Exam Instructions Reference */}
            {examInstructions && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-sm">📋 Quick Reference</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                    <div>
                      <strong>⏰ Duration:</strong> {examInstructions.duration_minutes} minutes
                    </div>
                    <div>
                      <strong>💾 Save:</strong> Save answers frequently
                    </div>
                    <div>
                      <strong>📎 Files:</strong> Any file type allowed
                    </div>
                    <div>
                      <strong>🌐 Connection:</strong> Keep internet stable
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
