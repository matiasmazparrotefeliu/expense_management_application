import apiClient from './client';
import type { Account } from '../types/auth';
import type { Category, CreateOperationPayload, ExtractedOperation, Operation } from '../types/operation';
import { API_ENDPOINTS } from '../utils/constants';

export const getAccounts = async (): Promise<Account[]> => {
  const response = await apiClient.get<Account[]>(API_ENDPOINTS.ACCOUNTS);
  return response.data;
};

export const getOperations = async (): Promise<Operation[]> => {
  const response = await apiClient.get<Operation[]>(API_ENDPOINTS.OPERATIONS);
  return response.data;
};

export const createAccount = async (data: import('../types/auth').CreateAccountPayload): Promise<Account> => {
  const response = await apiClient.post<Account>(API_ENDPOINTS.ACCOUNTS_NEW, data);
  return response.data;
};

export const getCategories = async (): Promise<Category[]> => {
  const response = await apiClient.get<Category[]>(API_ENDPOINTS.CATEGORIES);
  return response.data;
};

export const createOperation = async (data: CreateOperationPayload): Promise<Operation> => {
  const response = await apiClient.post<Operation>(API_ENDPOINTS.OPERATIONS_NEW, data);
  return response.data;
};

export const extractOperationFromText = async (
  narration: string,
  accountId: number
): Promise<ExtractedOperation> => {
  const response = await apiClient.post<ExtractedOperation>(API_ENDPOINTS.OPERATIONS_FROM_TEXT, {
    text: narration,
    account_id: accountId,
  });
  return response.data;
};