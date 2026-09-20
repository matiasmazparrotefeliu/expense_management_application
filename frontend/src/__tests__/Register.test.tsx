import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Register } from '../features/auth/Register';

describe('Register', () => {
  it('renders register form', () => {
    render(<Register />);
    expect(screen.getByText('Crear cuenta')).toBeInTheDocument();
  });

  it('renders name, email and password inputs', () => {
    render(<Register />);
    expect(screen.getByLabelText('Nombre completo')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
  });
});
