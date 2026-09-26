import apiClient from './client';
import type { Account } from '../types/auth';
import type { Category, CreateOperationPayload, Operation } from '../types/operation';

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