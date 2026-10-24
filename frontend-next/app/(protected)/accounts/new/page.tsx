'use client';

import { useRouter } from 'next/navigation';
import { NewAccountForm } from '@/components/dashboard/NewAccountForm';
import { useData } from '@/features/data/DataProvider';
import { ROUTES } from '@/utils/constants';

/**
 * "Nueva cuenta" page. The created account is auto-selected in the shared
 * DataProvider and the lists are reloaded there, then the page redirects back
 * to the dashboard.
 */
export default function NewAccountPage() {
  const router = useRouter();
  const { loading, addAccount } = useData();

  const goBack = () => router.push(ROUTES.DASHBOARD);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Nueva cuenta</h1>
        </div>
        <NewAccountForm onAddAccount={addAccount} onConfirm={goBack} onCancel={goBack} />
      </div>
    </div>
  );
}
