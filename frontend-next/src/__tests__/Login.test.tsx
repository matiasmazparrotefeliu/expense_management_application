import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { routerMock, AuthContextStub } from '@/__tests__/utils/testUtils';
import { Login } from '@/features/auth/Login';

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
  usePathname: () => '/login',
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const renderLogin = () => {
  return render(
    <AuthContextStub>
      <Login />
    </AuthContextStub>
  );
};

describe('Login', () => {
  it('renders login form', () => {
    renderLogin();
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  it('renders email and password inputs', () => {
    renderLogin();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
  });
});
