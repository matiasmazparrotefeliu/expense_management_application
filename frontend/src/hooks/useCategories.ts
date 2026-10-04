import { useState, useEffect, useCallback } from 'react';
import { getCategories } from '@/api/operationsApi';
import type { Category } from '@/types/operation';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCategories();
      setCategories(data);
      setError(null);
    } catch {
      setError('No se pudieron cargar las categorías');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const getCategoriesByType = useCallback((type: Category['type']) => {
    return categories.filter((cat) => cat.type === type && cat.is_active);
  }, [categories]);

  return { categories, loading, error, fetchCategories, getCategoriesByType };
}