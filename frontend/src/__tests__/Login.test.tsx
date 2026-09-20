import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Login } from '../features/auth/Login';

describe('Login', () => {
  it('renders login form', () => {
    render(<Login />);
    expect(screen.getByText('Iniciar sesión')).toBeInTheDocument();
  });

  it('renders email and password inputs', () => {
    render(<Login />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
  });
});
