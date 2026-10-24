'use client';

import { useContext, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext } from './AuthProvider';

/**
 * Client-side auth gate for the `(protected)` route group (dashboard, forms).
 * Mirrors the old `ProtectedRoute`: shows a loader while the session is being
 * restored from localStorage, and redirects to `/login` when there is no token.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const context = useContext(AuthContext);
  const router = useRouter();

  useEffect(() => {
    if (context && !context.loading && !context.token) {
      router.replace('/login');
    }
  }, [context, router]);

  if (!context) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  const { token, loading } = context;

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  if (!token) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  return <>{children}</>;
}
