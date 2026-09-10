import { z } from 'zod';

const dateSchema = z.preprocess(
  value => (typeof value === 'string' || typeof value === 'number' || value instanceof Date ? value : undefined),
  z.coerce.date({ invalid_type_error: 'Invalid date format' })
);

export const createRecordSchema = z.object({
  amount: z.number({ required_error: 'Amount is required' }).positive('Amount must be greater than 0'),
  type: z.enum(['income', 'expense'], { required_error: 'Type must be income or expense' }),
  category: z.string().trim().min(1, 'Category is required'),
  date: dateSchema,
  notes: z.string().trim().optional(),
}).strict();

export const updateRecordSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0').optional(),
  type: z.enum(['income', 'expense']).optional(),
  category: z.string().trim().min(1).optional(),
  date: dateSchema.optional(),
  notes: z.string().trim().optional(),
}).strict().refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

export const recordQuerySchema = z.object({
  type: z.enum(['income', 'expense']).optional(),
  category: z.string().trim().min(1).optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

export const recordIdSchema = z.string().uuid('Invalid ID format');
