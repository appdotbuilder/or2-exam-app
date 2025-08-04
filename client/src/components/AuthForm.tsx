
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { LoginInput, StudentRegistrationInput } from '../../../server/src/schema';

interface AuthFormProps {
  onLogin: (data: LoginInput) => Promise<void>;
  onRegister: (data: StudentRegistrationInput) => Promise<void>;
  isLoading: boolean;
}

export function AuthForm({ onLogin, onRegister, isLoading }: AuthFormProps) {
  const [loginData, setLoginData] = useState<LoginInput>({
    username: '',
    password: ''
  });

  const [registerData, setRegisterData] = useState<StudentRegistrationInput>({
    name: '',
    nim: '',
    attendance_number: '',
    username: '',
    password: '',
    password_confirmation: ''
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    try {
      await onLogin(loginData);
    } catch (error) {
      console.error('Login submission error:', error);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    
    if (registerData.password !== registerData.password_confirmation) {
      setValidationError("Passwords don't match");
      return;
    }

    try {
      await onRegister(registerData);
    } catch (error) {
      console.error('Registration submission error:', error);
    }
  };

  return (
    <Tabs defaultValue="login" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="login">Login</TabsTrigger>
        <TabsTrigger value="register">Student Registration</TabsTrigger>
      </TabsList>

      <TabsContent value="login" className="space-y-4">
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-username">Username</Label>
            <Input
              id="login-username"
              type="text"
              value={loginData.username}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setLoginData((prev: LoginInput) => ({ ...prev, username: e.target.value }))
              }
              placeholder="Enter your username"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              type="password"
              value={loginData.password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setLoginData((prev: LoginInput) => ({ ...prev, password: e.target.value }))
              }
              placeholder="Enter your password"
              required
            />
          </div>

          <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-md">
            <p className="font-medium mb-1">🎓 For Students:</p>
            <p>Use your registered username and password</p>
            <p className="font-medium mt-2 mb-1">👨‍🏫 For Lecturers:</p>
            <p>Username: <code className="bg-white px-1 rounded">buama</code></p>
            <p>Password: <code className="bg-white px-1 rounded">t42k1r0h</code></p>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="register" className="space-y-4">
        {validationError && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{validationError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="register-name">Full Name</Label>
            <Input
              id="register-name"
              type="text"
              value={registerData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setRegisterData((prev: StudentRegistrationInput) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="register-nim">NIM</Label>
              <Input
                id="register-nim"
                type="text"
                value={registerData.nim}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRegisterData((prev: StudentRegistrationInput) => ({ ...prev, nim: e.target.value }))
                }
                placeholder="Student ID Number"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-attendance">Attendance Number</Label>
              <Input
                id="register-attendance"
                type="text"
                value={registerData.attendance_number}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRegisterData((prev: StudentRegistrationInput) => ({ ...prev, attendance_number: e.target.value }))
                }
                placeholder="Attendance No."
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="register-username">Username</Label>
            <Input
              id="register-username"
              type="text"
              value={registerData.username}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setRegisterData((prev: StudentRegistrationInput) => ({ ...prev, username: e.target.value }))
              }
              placeholder="Choose a username (min. 3 characters)"
              minLength={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="register-password">Password</Label>
            <Input
              id="register-password"
              type="password"
              value={registerData.password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setRegisterData((prev: StudentRegistrationInput) => ({ ...prev, password: e.target.value }))
              }
              placeholder="Choose a password (min. 6 characters)"
              minLength={6}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="register-password-confirm">Confirm Password</Label>
            <Input
              id="register-password-confirm"
              type="password"
              value={registerData.password_confirmation}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setRegisterData((prev: StudentRegistrationInput) => ({ ...prev, password_confirmation: e.target.value }))
              }
              placeholder="Confirm your password"
              minLength={6}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating Account...' : 'Create Student Account'}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}
