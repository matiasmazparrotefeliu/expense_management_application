import { useState, useEffect, useCallback } from 'react';
import { getOperations, createOperation } from '@/api/operationsApi';
import type { Operation, CreateOperationPayload } from '@/types/operation';

export function useOperations() {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOperations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getOperations();
      setOperations(data);
      setError(null);
    } catch {
      setError('No se pudieron cargar las operaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOperations();
  }, [fetchOperations]);

  const addOperation = useCallback(async (data: CreateOperationPayload) => {
    const created = await createOperation(data);
    setOperations((prev) => [created, ...prev]);
    return created;
  }, []);

  return { operations, loading, error, fetchOperations, addOperation };
}