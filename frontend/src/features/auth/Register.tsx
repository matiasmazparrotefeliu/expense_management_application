import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterFormData } from './authSchema';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/common/Input/Input';
import { Button } from '@/components/common/Button/Button';
import { Alert } from '@/components/common/Alert/Alert';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock } from 'lucide-react';

export function Register() {
  const { register, error } = useAuth();
  const navigate = useNavigate();
  const [localError, setLocalError] = useState<string | null>(null);

  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await register(data);
      navigate('/login', { replace: true });
    } catch {
      setLocalError('Error al registrarse');
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Crear cuenta
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {displayError && <Alert message={displayError} />}
          <div className="rounded-md shadow-sm -space-y-px">
            <Input
              label="Nombre completo"
              type="text"
              {...registerField('name')}
              error={errors.name?.message}
              icon={<User />}
              placeholder="Tu nombre"
              autoComplete="name"
            />
            <Input
              label="Email"
              type="email"
              {...registerField('email')}
              error={errors.email?.message}
              icon={<Mail />}
              placeholder="tu@email.com"
              autoComplete="email"
            />
            <Input
              label="Contraseña"
              type="password"
              {...registerField('password')}
              error={errors.password?.message}
              icon={<Lock />}
              placeholder="mínimo 6 caracteres"
              autoComplete="new-password"
            />
          </div>
          <div>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Creando...' : 'Crear cuenta'}
            </Button>
          </div>
          <div className="text-sm text-center">
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              ¿Ya tienes cuenta? Inicia sesión
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
