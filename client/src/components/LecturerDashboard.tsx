
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { 
  User, 
  Question, 
  StudentAnswer,
  CreateQuestionInput,
  AutoGenerateQuestionsInput,
  QuestionTopic,
  QuestionStatus
} from '../../../server/src/schema';

interface LecturerDashboardProps {
  user: User;
}

export function LecturerDashboard({ user }: LecturerDashboardProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [studentAnswers, setStudentAnswers] = useState<StudentAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  // Question creation form
  const [newQuestion, setNewQuestion] = useState<CreateQuestionInput>({
    topic: 'monte_carlo',
    question_text: '',
    answer_key: null,
    max_score: 10,
    is_auto_generated: false
  });

  // Auto-generate form
  const [autoGenerate, setAutoGenerate] = useState<AutoGenerateQuestionsInput>({
    topic: 'monte_carlo',
    count: 5,
    max_score: 10
  });

  // Grading
  const [gradingScore, setGradingScore] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<StudentAnswer | null>(null);

  const loadQuestions = useCallback(async () => {
    try {
      const data = await trpc.getQuestions.query({ lecturerId: user.id });
      setQuestions(data);
    } catch (error) {
      console.error('Failed to load questions:', error);
      setError('Failed to load questions');
    }
  }, [user.id]);

  const loadStudentAnswers = useCallback(async () => {
    try {
      const data = await trpc.getAllStudentAnswers.query({ lecturerId: user.id });
      setStudentAnswers(data);
    } catch (error) {
      console.error('Failed to load student answers:', error);
      setError('Failed to load student answers');
    }
  }, [user.id]);

  useEffect(() => {
    loadQuestions();
    loadStudentAnswers();
  }, [loadQuestions, loadStudentAnswers]);

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const question = await trpc.createQuestion.mutate({
        ...newQuestion,
        lecturerId: user.id
      });
      setQuestions((prev: Question[]) => [...prev, question]);
      setNewQuestion({
        topic: 'monte_carlo',
        question_text: '',
        answer_key: null,
        max_score: 10,
        is_auto_generated: false
      });
    } catch (error) {
      setError('Failed to create question');
      console.error('Create question error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const generatedQuestions = await trpc.autoGenerateQuestions.mutate({
        ...autoGenerate,
        lecturerId: user.id
      });
      setQuestions((prev: Question[]) => [...prev, ...generatedQuestions]);
      setAutoGenerate({
        topic: 'monte_carlo',
        count: 5,
        max_score: 10
      });
    } catch (error) {
      setError('Failed to auto-generate questions');
      console.error('Auto-generate error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveQuestion = async (questionId: number) => {
    setIsLoading(true);
    try {
      await trpc.approveQuestion.mutate({ questionId, lecturerId: user.id });
      setQuestions((prev: Question[]) =>
        prev.map(q => q.id === questionId ? { ...q, status: 'approved' as QuestionStatus } : q)
      );
    } catch (error) {
      setError('Failed to approve question');
      console.error('Approve question error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGradeAnswer = async (answer: StudentAnswer) => {
    setIsLoading(true);
    try {
      await trpc.gradeAnswer.mutate({
        answer_id: answer.id,
        score: gradingScore,
        graded_by: user.id
      });
      setStudentAnswers((prev: StudentAnswer[]) =>
        prev.map(a => a.id === answer.id ? { 
          ...a, 
          score: gradingScore, 
          graded_by: user.id,
          graded_at: new Date()
        } : a)
      );
      setSelectedAnswer(null);
      setGradingScore(0);
    } catch (error) {
      setError('Failed to grade answer');
      console.error('Grade answer error:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const getStatusBadge = (status: QuestionStatus) => {
    const variants = {
      draft: 'secondary',
      approved: 'default',
      active: 'default'
    } as const;
    
    const colors = {
      draft: '✏️ Draft',
      approved: '✅ Approved',
      active: '🚀 Active'
    };
    
    return <Badge variant={variants[status]}>{colors[status]}</Badge>;
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert className="border-red-200 bg-red-50">
          
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="questions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="questions">📝 Question Management</TabsTrigger>
          <TabsTrigger value="answers">📋 Student Answers</TabsTrigger>
          <TabsTrigger value="grading">✅ Grading</TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="space-y-6">
          {/* Create Question */}
          <Card>
            <CardHeader>
              <CardTitle>➕ Create New Question</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateQuestion} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="topic">Topic</Label>
                    <Select 
                      value={newQuestion.topic || 'monte_carlo'} 
                      onValueChange={(value: QuestionTopic) => 
                        setNewQuestion((prev: CreateQuestionInput) => ({ ...prev, topic: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monte_carlo">🎲 Monte Carlo</SelectItem>
                        <SelectItem value="markov_chain">🔗 Markov Chain</SelectItem>
                        <SelectItem value="dynamic_programming">🧮 Dynamic Programming</SelectItem>
                        <SelectItem value="project_network_analysis">📊 Project Network</SelectItem>
                        <SelectItem value="game_theory">🎯 Game Theory</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_score">Max Score</Label>
                    <Input
                      id="max_score"
                      type="number"
                      value={newQuestion.max_score}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewQuestion((prev: CreateQuestionInput) => ({ 
                          ...prev, 
                          max_score: parseFloat(e.target.value) || 0 
                        }))
                      }
                      min="1"
                      step="0.5"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="question_text">Question Text</Label>
                  <Textarea
                    id="question_text"
                    value={newQuestion.question_text}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setNewQuestion((prev: CreateQuestionInput) => ({ 
                        ...prev, 
                        question_text: e.target.value 
                      }))
                    }
                    placeholder="Enter the question text..."
                    rows={4}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="answer_key">Answer Key (Optional)</Label>
                  <Textarea
                    id="answer_key"
                    value={newQuestion.answer_key || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setNewQuestion((prev: CreateQuestionInput) => ({ 
                        ...prev, 
                        answer_key: e.target.value || null 
                      }))
                    }
                    placeholder="Enter the answer key or expected solution..."
                    rows={3}
                  />
                </div>

                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : '➕ Create Question'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Auto-Generate Questions */}
          <Card>
            <CardHeader>
              <CardTitle>🤖 Auto-Generate Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAutoGenerate} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Topic</Label>
                    <Select 
                      value={autoGenerate.topic || 'monte_carlo'} 
                      onValueChange={(value: QuestionTopic) => 
                        setAutoGenerate((prev: AutoGenerateQuestionsInput) => ({ ...prev, topic: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monte_carlo">🎲 Monte Carlo</SelectItem>
                        <SelectItem value="markov_chain">🔗 Markov Chain</SelectItem>
                        <SelectItem value="dynamic_programming">🧮 Dynamic Programming</SelectItem>
                        <SelectItem value="project_network_analysis">📊 Project Network</SelectItem>
                        <SelectItem value="game_theory">🎯 Game Theory</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Count</Label>
                    <Input
                      type="number"
                      value={autoGenerate.count}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setAutoGenerate((prev: AutoGenerateQuestionsInput) => ({ 
                          ...prev, 
                          count: parseInt(e.target.value) || 1 
                        }))
                      }
                      min="1"
                      max="10"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Score</Label>
                    <Input
                      type="number"
                      value={autoGenerate.max_score}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setAutoGenerate((prev: AutoGenerateQuestionsInput) => ({ 
                          ...prev, 
                          max_score: parseFloat(e.target.value) || 10 
                        }))
                      }
                      min="1"
                      step="0.5"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Generating...' : '🤖 Generate Questions'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Questions List */}
          <Card>
            <CardHeader>
              <CardTitle>📋 All Questions ({questions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {questions.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No questions created yet. Create some questions above!
                  </p>
                ) : (
                  questions.map((question: Question) => (
                    <Card key={question.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center space-x-3">
                            <Badge variant="outline">{getTopicLabel(question.topic)}</Badge>
                            {getStatusBadge(question.status)}
                            {question.is_auto_generated && (
                              <Badge variant="secondary">🤖 Auto-generated</Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">
                              Score: {question.max_score} pts
                            </span>
                            {question.status === 'draft' && (
                              <Button
                                size="sm"
                                onClick={() => handleApproveQuestion(question.id)}
                                disabled={isLoading}
                              >
                                ✅ Approve
                              </Button>
                            )}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => setSelectedQuestion(question)}>
                                  👁️ View
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Question Details</DialogTitle>
                                </DialogHeader>
                                {selectedQuestion && (
                                  <div className="space-y-4">
                                    <div>
                                      <Label className="font-medium">Topic:</Label>
                                      <p>{getTopicLabel(selectedQuestion.topic)}</p>
                                    </div>
                                    <div>
                                      <Label className="font-medium">Question:</Label>
                                      <p className="whitespace-pre-wrap mt-1">{selectedQuestion.question_text}</p>
                                    </div>
                                    {selectedQuestion.answer_key && (
                                      <div>
                                        <Label className="font-medium">Answer Key:</Label>
                                        <p className="whitespace-pre-wrap mt-1 bg-gray-50 p-3 rounded">
                                          {selectedQuestion.answer_key}
                                        </p>
                                      </div>
                                    )}
                                    <div className="flex justify-between text-sm text-gray-500">
                                      <span>Max Score: {selectedQuestion.max_score} pts</span>
                                      <span>Created: {selectedQuestion.created_at.toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                        <p className="text-gray-700 line-clamp-2">{question.question_text}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          Created: {question.created_at.toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="answers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>📋 All Student Answers ({studentAnswers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {studentAnswers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No student answers submitted yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Question</TableHead>
                      <TableHead>Answer</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentAnswers.map((answer: StudentAnswer) => (
                      <TableRow key={answer.id}>
                        <TableCell>Student #{answer.session_id}</TableCell>
                        <TableCell>Question #{answer.question_id}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {answer.answer_text || 'No text answer'}
                          {answer.attachment_path && <Badge variant="outline" className="ml-2">📎 File</Badge>}
                        </TableCell>
                        <TableCell>
                          {answer.score !== null ? `${answer.score} pts` : 'Not graded'}
                        </TableCell>
                        <TableCell>
                          {answer.graded_at ? (
                            <Badge variant="default">✅ Graded</Badge>
                          ) : (
                            <Badge variant="secondary">⏳ Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedAnswer(answer)}
                              >
                                👁️ View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Student Answer Details</DialogTitle>
                              </DialogHeader>
                              {selectedAnswer && (
                                <div className="space-y-4">
                                  <div>
                                    <Label className="font-medium">Answer Text:</Label>
                                    <p className="whitespace-pre-wrap mt-1 bg-gray-50 p-3 rounded">
                                      {selectedAnswer.answer_text || 'No text answer provided'}
                                    </p>
                                  </div>
                                  {selectedAnswer.attachment_path && (
                                    <div>
                                      <Label className="font-medium">Attachment:</Label>
                                      <p className="mt-1">📎 {selectedAnswer.attachment_path}</p>
                                    </div>
                                  )}
                                  <div className="flex justify-between text-sm text-gray-500">
                                    <span>Submitted: {selectedAnswer.created_at.toLocaleDateString()}</span>
                                    {selectedAnswer.graded_at && (
                                      <span>Graded: {selectedAnswer.graded_at.toLocaleDateString()}</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grading" className="space-y-6">
          
          <Card>
            <CardHeader>
              <CardTitle>✅ Grade Student Answers</CardTitle>
            </CardHeader>
            <CardContent>
              {studentAnswers.filter(a => !a.graded_at).length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  All submitted answers have been graded!
                </p>
              ) : (
                <div className="space-y-4">
                  {studentAnswers
                    .filter(answer => !answer.graded_at)
                    .map((answer: StudentAnswer) => (
                      <Card key={answer.id} className="border-l-4 border-l-orange-500">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-medium">Student #{answer.session_id} - Question #{answer.question_id}</h4>
                              <p className="text-sm text-gray-500">
                                Submitted: {answer.created_at.toLocaleDateString()}
                              </p>
                            </div>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  ✅ Grade Answer
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Grade Answer</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label className="font-medium">Student Answer:</Label>
                                    <p className="whitespace-pre-wrap mt-1 bg-gray-50 p-3 rounded">
                                      {answer.answer_text || 'No text answer provided'}
                                    </p>
                                    {answer.attachment_path && (
                                      <p className="mt-2">📎 Attachment: {answer.attachment_path}</p>
                                    )}
                                  </div>
                                  
                                  <Separator />
                                  
                                  <div className="space-y-2">
                                    <Label htmlFor="grade-score">Score</Label>
                                    <Input
                                      id="grade-score"
                                      type="number"
                                      value={gradingScore}
                                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setGradingScore(parseFloat(e.target.value) || 0)
                                      }
                                      min="0"
                                      step="0.5"
                                      placeholder="Enter score..."
                                    />
                                  </div>
                                  
                                  <div className="flex space-x-2">
                                    <Button
                                      onClick={() => handleGradeAnswer(answer)}
                                      disabled={isLoading}
                                    >
                                      {isLoading ? 'Saving...' : '💾 Save Grade'}
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                          
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-sm font-medium mb-1">Answer Preview:</p>
                            <p className="line-clamp-3">
                              {answer.answer_text || 'No text answer provided'}
                            </p>
                            {answer.attachment_path && (
                              <p className="text-sm text-blue-600 mt-1">📎 {answer.attachment_path}</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
