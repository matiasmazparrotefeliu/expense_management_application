import apiClient from './client';
import type { Account } from '../types/auth';
import type { Category, CreateOperationPayload, ExtractedOperation, Operation } from '../types/operation';

export const getAccounts = async (): Promise<Account[]> => {
  const response = await apiClient.get<Account[]>('/accounts/');
  return response.data;
};

export const getOperations = async (): Promise<Operation[]> => {
  const response = await apiClient.get<Operation[]>('/operations/');
  return response.data;
};

export const createAccount = async (data: {
  name: string;
  currency: string;
  balance: number;
  bank: string;
}): Promise<Account> => {
  const response = await apiClient.post<Account>('/accounts/new', data);
  return response.data;
};

export const getCategories = async (): Promise<Category[]> => {
  const response = await apiClient.get<Category[]>('/categories/');
  return response.data;
};

export const createOperation = async (data: CreateOperationPayload): Promise<Operation> => {
  const response = await apiClient.post<Operation>('/operations/new', data);
  return response.data;
};

export const extractOperationFromText = async (
  narration: string,
  accountId: number
): Promise<ExtractedOperation> => {
  const response = await apiClient.post<ExtractedOperation>('/operations/from-text', {
    text: narration,
    account_id: accountId,
  });
  return response.data;
};