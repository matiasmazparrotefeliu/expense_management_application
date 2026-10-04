import { useState, useEffect, useCallback } from 'react';
import { getAccounts, createAccount } from '@/api/operationsApi';
import type { Account, CreateAccountPayload } from '@/types/auth';

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAccounts();
      setAccounts(data);
      setError(null);
    } catch {
      setError('No se pudieron cargar las cuentas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const addAccount = useCallback(async (data: CreateAccountPayload) => {
    const created = await createAccount(data);
    setAccounts((prev) => [...prev, created]);
    return created;
  }, []);

  return { accounts, loading, error, fetchAccounts, addAccount };
}