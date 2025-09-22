import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useForm, SubmitHandler } from 'react-hook-form';
import Card from './components/common/Card';
import Button from './components/common/Button';
import Input from './components/common/Input';
import { Briefcase, Eye, EyeOff } from 'lucide-react';

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
      navigate('/dashboard');
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
                Can't log in?{' '}
                <Link to="/connect-supabase" className="font-medium text-primary hover:underline">
                    Configure Backend
                </Link>
            </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;