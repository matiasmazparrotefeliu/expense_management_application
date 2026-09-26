export interface Category {
  id: number;
  name: string;
  type: 'Income' | 'Expense' | 'Transfer';
  description: string | null;
  is_active: boolean;
}

export interface Operation {
  id: number;
  concept: string;
  amount: number;
  type: 'Income' | 'Expense' | 'Transfer';
  currency: string;
  date: string;
  account_id: number;
  category_id: number;
  category: Category | null;
  name: string | null;
}

export type OperationTypeInput = 'ingreso' | 'egreso' | 'transferencia';

export interface CreateOperationPayload {
  concept: string;
  amount: number;
  type: OperationTypeInput;
  account_id: number;
  category_id: number;
  name?: string;
}