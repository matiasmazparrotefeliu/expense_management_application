import { z } from 'zod';
import { CURRENCIES, OPERATION_TYPES } from '@/utils/constants';

const currencyEnum = CURRENCIES as unknown as [string, ...string[]];
const operationTypeEnum = OPERATION_TYPES.map((t: { value: string }) => t.value) as unknown as [string, ...string[]];

export const createAccountSchema = z.object({
  name: z.string().min(1, 'El nombre de la cuenta es obligatorio'),
  currency: z.enum(currencyEnum, { errorMap: () => ({ message: 'Moneda no soportada' }) }),
  balance: z.coerce.number().gt(0, 'El balance inicial debe ser mayor a 0'),
  bank: z.string().min(1, 'La entidad bancaria es obligatoria'),
});

export type CreateAccountFormData = z.infer<typeof createAccountSchema>;

export const createOperationSchema = z.object({
  concept: z.string().min(1, 'El concepto es obligatorio'),
  amount: z.coerce.number().gt(0, 'El monto debe ser mayor a 0'),
  type: z.enum(operationTypeEnum),
  account_id: z.coerce.number().int().positive('Cuenta inválida'),
  category_id: z.coerce.number().int().positive('Categoría inválida'),
  name: z.string().optional(),
  currency: z.enum(currencyEnum).optional(),
});

export type CreateOperationFormData = z.infer<typeof createOperationSchema>;

export const extractOperationSchema = z.object({
  narration: z.string().min(1, 'El relato es obligatorio').max(500, 'Máximo 500 caracteres'),
  account_id: z.coerce.number().int().positive('Cuenta inválida'),
});

export type ExtractOperationFormData = z.infer<typeof extractOperationSchema>;