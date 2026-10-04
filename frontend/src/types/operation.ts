/**
 * Canonical operation types used throughout the frontend.
 * Matches backend enum values (Income, Expense, Transfer).
 */
export type OperationType = 'Income' | 'Expense' | 'Transfer';

/**
 * Spanish display labels for operation types
 */
export type OperationTypeInput = 'ingreso' | 'egreso' | 'transferencia';

/**
 * Lowercase English types from AI extraction
 */
export type ExtractedOperationType = 'income' | 'expense' | 'transfer';

export interface Category {
  id: number;
  name: string;
  type: OperationType;
  description: string | null;
  is_active: boolean;
}

export interface Operation {
  id: number;
  concept: string;
  amount: number;
  type: OperationType;
  currency: string;
  date: string;
  account_id: number;
  category_id: number;
  category: Category | null;
  name: string | null;
}

export interface CreateOperationPayload {
  concept: string;
  amount: number;
  type: OperationTypeInput;
  account_id: number;
  category_id: number;
  name?: string;
  currency?: string;
}

export interface ExtractedOperation {
  concept: string;
  amount: number;
  currency: string | null;
  type: ExtractedOperationType;
  category_id: number;
  name: string | null;
}

/**
 * Type conversion utilities
 */
export const OperationTypeMapper = {
  /** Convert Spanish input to canonical type */
  fromInput: (input: OperationTypeInput): OperationType => {
    switch (input) {
      case 'ingreso':
        return 'Income';
      case 'egreso':
        return 'Expense';
      case 'transferencia':
        return 'Transfer';
    }
  },

  /** Convert AI extracted type to canonical type */
  fromExtracted: (extracted: ExtractedOperationType): OperationType => {
    switch (extracted) {
      case 'income':
        return 'Income';
      case 'expense':
        return 'Expense';
      case 'transfer':
        return 'Transfer';
    }
  },

  /** Convert canonical type to Spanish input */
  toInput: (type: OperationType): OperationTypeInput => {
    switch (type) {
      case 'Income':
        return 'ingreso';
      case 'Expense':
        return 'egreso';
      case 'Transfer':
        return 'transferencia';
    }
  },

  /** Get display label for canonical type */
  getLabel: (type: OperationType): string => {
    switch (type) {
      case 'Income':
        return 'Ingreso';
      case 'Expense':
        return 'Egreso';
      case 'Transfer':
        return 'Transferencia';
    }
  },

  /** Get category type filter for canonical type */
  getCategoryType: (type: OperationType): Category['type'] => type,
} as const;

/** All valid input types for forms */
export const OPERATION_TYPE_INPUTS: OperationTypeInput[] = ['ingreso', 'egreso', 'transferencia'];

/** Display options for select inputs */
export const OPERATION_TYPE_OPTIONS = [
  { value: 'ingreso', label: 'Ingreso' },
  { value: 'egreso', label: 'Egreso' },
  { value: 'transferencia', label: 'Transferencia' },
] as const;