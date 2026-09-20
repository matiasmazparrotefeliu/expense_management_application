import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema } from '../features/auth/authSchema';

describe('Auth Schema', () => {
  it('validates correct login data', () => {
    const result = loginSchema.safeParse({ email: 'test@test.com', password: 'pass123' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'invalid', password: 'pass123' });
    expect(result.success).toBe(false);
  });

  it('validates correct registration data', () => {
    const result = registerSchema.safeParse({ name: 'Test', email: 'test@test.com', password: 'pass123456' });
    expect(result.success).toBe(true);
  });

  it('rejects short password', () => {
    const result = registerSchema.safeParse({ name: 'Test', email: 'test@test.com', password: 'short' });
    expect(result.success).toBe(false);
  });
});
