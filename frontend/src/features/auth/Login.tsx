import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from './authSchema';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/common/Input/Input';
import { Button } from '@/components/common/Button/Button';
import { Alert } from '@/components/common/Alert/Alert';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';

export function Login() {
  const { login, error } = useAuth();
  const navigate = useNavigate();
  const [localError, setLocalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
      navigate('/', { replace: true });
    } catch {
      setLocalError('Error al iniciar sesión');
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Iniciar sesión
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {displayError && <Alert message={displayError} />}
          <div className="rounded-md shadow-sm -space-y-px">
            <Input
              label="Email"
              type="email"
              {...register('email')}
              error={errors.email?.message}
              icon={<Mail />}
              placeholder="tu@email.com"
              autoComplete="email"
            />
            <Input
              label="Contraseña"
              type="password"
              {...register('password')}
              error={errors.password?.message}
              icon={<Lock />}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <div>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Iniciando...' : 'Iniciar sesión'}
            </Button>
          </div>
          <div className="text-sm text-center">
            <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
              ¿No tienes cuenta? Regístrate
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
