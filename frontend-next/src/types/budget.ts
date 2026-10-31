import type { OperationType } from './operation';

/** Usage snapshot of any configured spending cap, as returned embedded in the
 * monthly summary (`used` is the actual consumption it controls). */
export interface BudgetLimitSnapshot {
  id: number;
  amount: number;
  used: number;
  percentage: number;
}

/** One debit group of the monthly breakdown: an expense/transfer category
 * aggregated over the fiscal month, with its optional cap progress. */
export interface CategoryExpenseItem {
  category_id: number;
  category_name: string;
  type: OperationType;
  amount: number;
  count: number;
  percentage: number;
  limit: BudgetLimitSnapshot | null;
}

/** Response of `GET /budgets/summary?account_id=&year=&month=` — the monthly
 * salary vs consumption snapshot, scoped to one account (its `currency` is the
 * single reference for every amount). `consumption_percentage` is null when no
 * salary-like income was registered in the period. */
export interface MonthlySummary {
  account_id: number;
  currency: string;
  year: number;
  month: number;
  total_salary: number;
  total_income: number;
  total_expenses: number;
  net_available: number;
  consumption_percentage: number | null;
  global_limit: BudgetLimitSnapshot | null;
  categories: CategoryExpenseItem[];
}

/** Payload of `POST /budgets/` (upsert): the cap is scoped to `account_id`;
 * `category_id: null` targets the global cap, an id targets that category's
 * cap. */
export interface SaveBudgetLimitPayload {
  account_id: number;
  category_id: number | null;
  amount: number;
  month: number;
  year: number;
}

/** Configured cap (`GET /budgets/?account_id=&year=&month=`). */
export interface BudgetLimit {
  id: number;
  account_id: number;
  category_id: number | null;
  category_name: string | null;
  amount: number;
  month: number;
  year: number;
}
