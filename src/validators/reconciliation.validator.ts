import { z } from 'zod';

const referenceTransactionSchema = z.object({
  id: z.string().uuid('Reference transaction id must be a valid UUID'),
  amount: z.number({ required_error: 'Reference amount is required' })
    .finite('Reference amount must be a finite number')
    .positive('Reference amount must be greater than 0')
    .refine(value => value <= 999999999999.99 && Math.round(value * 100) === value * 100, 'Reference amount must fit NUMERIC(14,2)'),
  type: z.enum(['income', 'expense'], { required_error: 'Reference type must be income or expense' }),
  category: z.string().trim().min(1, 'Reference category is required'),
}).strict();

export const reconciliationSchema = z.object({
  referenceTransactions: z.array(referenceTransactionSchema).max(10000, 'Too many reference transactions'),
}).strict().superRefine(({ referenceTransactions }, context) => {
  const ids = new Set<string>();
  referenceTransactions.forEach((transaction, index) => {
    if (ids.has(transaction.id)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['referenceTransactions', index, 'id'], message: 'Reference transaction ids must be unique' });
    }
    ids.add(transaction.id);
  });
});

export type ReferenceTransactionInput = z.infer<typeof referenceTransactionSchema>;
