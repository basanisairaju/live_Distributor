import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useForm, SubmitHandler } from 'react-hook-form';
import Card from './common/Card';
import Button from './common/Button';
import Input from './common/Input';
import { Briefcase, Eye, EyeOff, Info } from 'lucide-react';
import { isLive } from '../services/api';

interface FormInputs {
  email: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const { register, handleSubmit, formState: { errors, isValid } } = useForm<FormInputs>({
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin: SubmitHandler<FormInputs> = async (data) => {
    setIsLoading(true);
    setLoginError(null);
    try {
      await login(data.email, data.password);
      // Navigate to root to let ProtectedRoute handle redirection (e.g., to portal selection)
      navigate('/');
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
            <Briefcase size={40} className="mx-auto text-primary" />
            <h1 className="text-3xl font-bold text-content mt-4">Distributor Portal</h1>
        </div>
        <Card>
            <h2 className="text-lg font-semibold text-center text-content mb-1">Welcome back</h2>
            <p className="text-sm text-contentSecondary text-center mb-6">Please sign in to continue</p>
            
            {isLive ? (
              <div className="mb-4 p-3 bg-green-50 text-green-800 rounded-lg text-sm flex items-start">
                <Info size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  Connected to <strong>Live Backend</strong>. Use your Supabase credentials.
                </div>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm flex items-start">
                <Info size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  Running in <strong>Mock Mode</strong>. Use sample credentials:
                  <ul className="list-disc list-inside mt-1">
                    <li><code className="text-xs">plant.admin@distributor.com</code> / <code className="text-xs">password</code></li>
                  </ul>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit(handleLogin)} className="space-y-4">
            <Input
                id="email"
                label="Username or Email"
                type="text"
                {...register('email', { 
                    required: 'Username or Email is required'
                })}
                error={errors.email?.message}
                autoComplete="username"
            />
            <Input
                id="password"
                label="Password"
                type={showPassword ? "text" : "password"}             
                {...register('password', { required: 'Password is required' })}
                error={errors.password?.message}
                autoComplete="current-password"
                rightIcon={showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                onRightIconClick={() => setShowPassword(!showPassword)}
            />
            {loginError && <p className="text-sm text-red-600 text-center pt-2">{loginError}</p>}
            <div className="pt-4">
                <Button type="submit" className="w-full" size="lg" isLoading={isLoading} disabled={!isValid}>
                    Login
                </Button>
            </div>
            </form>
        </Card>
        <div className="text-center mt-4 text-sm">
            <p className="text-contentSecondary">
                Contact support if you have trouble logging in.
            </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
