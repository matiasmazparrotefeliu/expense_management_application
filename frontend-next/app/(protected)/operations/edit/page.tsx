import { Suspense } from 'react';
import { EditOperationForm } from '@/features/operations/EditOperationForm';

export default function EditOperationPage() {
  return (
    <Suspense fallback={null}>
      <EditOperationForm />
    </Suspense>
  );
}
