import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { routerMock, AuthContextStub } from '@/__tests__/utils/testUtils';
import { Register } from '@/features/auth/Register';

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
  usePathname: () => '/register',
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const renderRegister = () => {
  return render(
    <AuthContextStub>
      <Register />
    </AuthContextStub>
  );
};

describe('Register', () => {
  it('renders register form', () => {
    renderRegister();
    expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument();
  });

  it('renders name, email and password inputs', () => {
    renderRegister();
    expect(screen.getByLabelText('Nombre completo')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
  });
});
