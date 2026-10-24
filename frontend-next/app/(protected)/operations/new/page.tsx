import { Suspense } from 'react';
import NewOperationForm from '@/features/operations/NewOperationForm';

export default function NewOperationPage() {
  return (
    <Suspense fallback={null}>
      <NewOperationForm />
    </Suspense>
  );
}
