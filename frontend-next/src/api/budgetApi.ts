import apiClient from './client';
import type { BudgetLimit, MonthlySummary, SaveBudgetLimitPayload } from '../types/budget';
import { API_ENDPOINTS } from '../utils/constants';

export const getMonthlySummary = async (
  year: number,
  month: number,
  accountId: number
): Promise<MonthlySummary> => {
  const response = await apiClient.get<MonthlySummary>(API_ENDPOINTS.BUDGETS_SUMMARY, {
    params: { year, month, account_id: accountId },
  });
  return response.data;
};

export const saveBudgetLimit = async (data: SaveBudgetLimitPayload): Promise<BudgetLimit> => {
  const response = await apiClient.post<BudgetLimit>(API_ENDPOINTS.BUDGETS, data);
  return response.data;
};

export const deleteBudgetLimit = async (id: number): Promise<void> => {
  await apiClient.delete(`${API_ENDPOINTS.BUDGETS_BY_ID}/${id}`);
};
