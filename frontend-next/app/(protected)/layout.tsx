import { DataProvider } from '@/features/data/DataProvider';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';

/**
 * Gate + shared data for the protected route group: the auth check runs first,
 * and only then do the dashboard and the `/operations/new` + `/accounts/new`
 * pages mount with the single shared GET pair.
 */
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <DataProvider>{children}</DataProvider>
    </ProtectedRoute>
  );
}
