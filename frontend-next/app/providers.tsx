'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { UNAUTHORIZED_EVENT } from '@/api/client';

/**
 * Listens for the axios 401 interceptor's `auth:unauthorized` event and
 * performs the App Router navigation to the login page (the interceptor
 * already cleared the persisted session).
 */
function UnauthorizedRedirect() {
  const router = useRouter();

  useEffect(() => {
    const handleUnauthorized = () => {
      router.push('/login');
    };
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [router]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <UnauthorizedRedirect />
      {children}
    </AuthProvider>
  );
}
