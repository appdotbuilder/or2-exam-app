
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Clock, FileText, AlertTriangle, Wifi } from 'lucide-react';
import type { User } from '../../../server/src/schema';
import type { ExamInstructions } from '../../../server/src/handlers/get_exam_instructions';

interface StudentDashboardProps {
  user: User;
  onStartExam: () => Promise<void>;
  examInstructions: ExamInstructions | null;
  isLoading: boolean;
}

export function StudentDashboard({ user, onStartExam, examInstructions, isLoading }: StudentDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>👋 Welcome, {user.name}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">NIM:</span> {user.nim}
            </div>
            <div>
              <span className="font-medium">Attendance Number:</span> {user.attendance_number}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exam Instructions */}
      {examInstructions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Exam Instructions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-blue-200 bg-blue-50">
              <Clock className="h-4 w-4" />
              <AlertDescription className="text-blue-800">
                <strong>Duration:</strong> {examInstructions.duration_minutes} minutes
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Important Guidelines:</h4>
              <ul className="space-y-2">
                {examInstructions.instructions.map((instruction: string, index: number) => (
                  <li key={index} className="flex items-start space-x-2 text-sm">
                    <span className="text-blue-600 mt-1.5 text-xs">•</span>
                    <span>{instruction}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-orange-800">
                  <strong>Timer Warning:</strong> Exam starts immediately when you click "Start Exam"
                </AlertDescription>
              </Alert>
              
              <Alert className="border-green-200 bg-green-50">
                <Wifi className="h-4 w-4" />
                <AlertDescription className="text-green-800">
                  <strong>Connection:</strong> Ensure stable internet throughout the exam
                </AlertDescription>
              </Alert>
              
              <Alert className="border-purple-200 bg-purple-50">
                <FileText className="h-4 w-4" />
                <AlertDescription className="text-purple-800">
                  <strong>Attachments:</strong> You can upload files of any type
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exam Topics */}
      <Card>
        <CardHeader>
          <CardTitle>📚 Exam Topics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Badge variant="outline" className="p-3 justify-start">
              🎲 Monte Carlo Methods
            </Badge>
            <Badge variant="outline" className="p-3 justify-start">
              🔗 Markov Chain Analysis
            </Badge>
            <Badge variant="outline" className="p-3 justify-start">
              🧮 Dynamic Programming
            </Badge>
            <Badge variant="outline" className="p-3 justify-start">
              📊 Project Network Analysis
            </Badge>
            <Badge variant="outline" className="p-3 justify-start">
              🎯 Game Theory
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Start Exam Section */}
      <Card className="border-2 border-dashed border-blue-300">
        <CardHeader>
          <CardTitle className="text-center text-xl">🚀 Ready to Start Your Exam?</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            Make sure you have read all the instructions above and are ready to begin.
          </p>
          <p className="text-sm text-orange-600 font-medium">
            ⚠️ The timer will start immediately when you click the button below!
          </p>
          <Button 
            size="lg" 
            onClick={onStartExam}
            disabled={isLoading}
            className="w-full max-w-xs mx-auto bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Starting Exam...' : '🎯 Start Exam'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
