'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getAccounts,
  getCategories,
  getOperations,
  createAccount,
  createOperation,
  updateOperation,
  deleteOperation,
} from '@/api/operationsApi';
import type { Account, CreateAccountPayload } from '@/types/auth';
import type { Category, CreateOperationPayload, Operation } from '@/types/operation';

/**
 * Single owner of the protected app's shared data: accounts, categories and
 * operations. Lives in the `(protected)` layout so the dashboard and the
 * `/operations/new` + `/accounts/new` pages share one pair of `GET`s instead of
 * refetching per page, and it keeps `selectedAccountId` consistent across
 * navigations (the account chosen in the dashboard panel is the one prefilled
 * in the operation form).
 */
interface DataContextType {
  accounts: Account[];
  categories: Category[];
  operations: Operation[];
  loading: boolean;
  error: string | null;
  selectedAccountId: number | null;
  selectAccount: (id: number) => void;
  fetchAccounts: () => Promise<void>;
  fetchOperations: () => Promise<void>;
  refreshAll: () => Promise<void>;
  addAccount: (data: CreateAccountPayload) => Promise<Account>;
  addOperation: (data: CreateOperationPayload) => Promise<Operation>;
  editOperation: (id: number, data: Partial<CreateOperationPayload>) => Promise<void>;
  removeOperation: (id: number) => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

type LoadingField = 'accounts' | 'categories' | 'operations';

export function DataProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loadingMap, setLoadingMap] = useState<Record<LoadingField, boolean>>({
    accounts: true,
    categories: true,
    operations: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  const loading = loadingMap.accounts || loadingMap.categories || loadingMap.operations;

  const runFetch = useCallback(
    async (field: LoadingField, fetcher: () => Promise<unknown>) => {
      try {
        setLoadingMap((prev) => ({ ...prev, [field]: true }));
        const data = await fetcher();
        if (field === 'accounts') setAccounts(data as Account[]);
        if (field === 'categories') setCategories(data as Category[]);
        if (field === 'operations') setOperations(data as Operation[]);
        setError(null);
      } catch {
        setError('No se pudieron cargar los datos');
      } finally {
        setLoadingMap((prev) => ({ ...prev, [field]: false }));
      }
    },
    []
  );

  const fetchAccounts = useCallback(
    () => runFetch('accounts', getAccounts),
    [runFetch]
  );
  const fetchOperations = useCallback(
    () => runFetch('operations', getOperations),
    [runFetch]
  );
  const refreshAll = useCallback(async () => {
    await Promise.all([fetchAccounts(), fetchOperations()]);
  }, [fetchAccounts, fetchOperations]);

  useEffect(() => {
    runFetch('categories', getCategories);
    refreshAll();
  }, [runFetch, refreshAll]);

  // Seed the selection with the first loaded account, exactly like the old
  // Dashboard did while it owned the account list.
  useEffect(() => {
    if (!loading && accounts.length > 0 && selectedAccountId === null) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, loading, selectedAccountId]);

  const selectAccount = useCallback((id: number) => {
    setSelectedAccountId(id);
  }, []);

  const addAccount = useCallback(async (data: CreateAccountPayload) => {
    // Optimistic append first (same behavior as the old useAccounts hook),
    // then reload both lists so balances stay authoritative.
    const created = await createAccount(data);
    setAccounts((prev) => [...prev, created]);
    setSelectedAccountId(created.id);
    await Promise.all([fetchAccounts(), fetchOperations()]);
    return created;
  }, [fetchAccounts, fetchOperations]);

  const addOperation = useCallback(async (data: CreateOperationPayload) => {
    const created = await createOperation(data);
    setOperations((prev) => [created, ...prev]);
    // Reload both lists right away: the balance changed, and the redirect
    // target (the dashboard) should render the refreshed data.
    await Promise.all([fetchAccounts(), fetchOperations()]);
    return created;
  }, [fetchAccounts, fetchOperations]);

  const editOperation = useCallback(async (id: number, data: Partial<CreateOperationPayload>) => {
    await updateOperation(id, data);
    // Reload both lists: the balance changed.
    await Promise.all([fetchAccounts(), fetchOperations()]);
  }, [fetchAccounts, fetchOperations]);

  const removeOperation = useCallback(async (id: number) => {
    await deleteOperation(id);
    // Reload both lists: the balance changed.
    await Promise.all([fetchAccounts(), fetchOperations()]);
  }, [fetchAccounts, fetchOperations]);

  const value = useMemo(
    () => ({
      accounts,
      categories,
      operations,
      loading,
      error,
      selectedAccountId,
      selectAccount,
      fetchAccounts,
      fetchOperations,
      refreshAll,
      addAccount,
      addOperation,
      editOperation,
      removeOperation,
    }),
    [
      accounts,
      categories,
      operations,
      loading,
      error,
      selectedAccountId,
      selectAccount,
      fetchAccounts,
      fetchOperations,
      refreshAll,
      addAccount,
      addOperation,
      editOperation,
      removeOperation,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
