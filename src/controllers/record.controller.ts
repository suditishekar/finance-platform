import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import {
  createRecordSchema,
  recordIdSchema,
  updateRecordSchema,
  recordQuerySchema,
} from '../validators/record.validator';
import catchAsync from '../utils/catchAsync';
import {
  createTransaction,
  findTransactionById,
  findTransactions,
  softDeleteTransaction,
  updateTransaction,
} from '../models/Transaction';
import { loadUsersByIds, toFinancialRecord } from '../utils/transactionResponse';

const parseRecordId = (id: string, res: Response): string | null => {
  const parsed = recordIdSchema.safeParse(id);
  if (!parsed.success) {
    sendError(res, 'Invalid ID format', 400);
    return null;
  }
  return parsed.data;
};

export const createRecord = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const parsed = createRecordSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const transaction = await createTransaction({
    amount: parsed.data.amount,
    type: parsed.data.type,
    category: parsed.data.category,
    description: parsed.data.notes,
    transactionDate: parsed.data.date,
    createdBy: String(req.user!._id),
  });

  sendSuccess(res, { record: toFinancialRecord(transaction, req.user) }, 201);
});

export const listRecords = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const parsed = recordQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const { type, category, from, to, page, limit } = parsed.data;

  const { rows, total } = await findTransactions({ type, category, from, to, page, limit });
  const users = await loadUsersByIds(rows.map(row => row.created_by));
  const records = rows.map(row => toFinancialRecord(row, users.get(row.created_by)));

  sendSuccess(res, {
    records,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
});

export const getRecord = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = parseRecordId(req.params.id, res);
  if (!id) return;

  const transaction = await findTransactionById(id);

  if (!transaction) {
    sendError(res, 'Record not found', 404);
    return;
  }

  const users = await loadUsersByIds([transaction.created_by]);
  sendSuccess(res, { record: toFinancialRecord(transaction, users.get(transaction.created_by)) });
});

export const updateRecord = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const parsed = updateRecordSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const id = parseRecordId(req.params.id, res);
  if (!id) return;

  const transaction = await updateTransaction(id, {
    amount: parsed.data.amount,
    type: parsed.data.type,
    category: parsed.data.category,
    description: parsed.data.notes,
    transactionDate: parsed.data.date,
  });

  if (!transaction) {
    sendError(res, 'Record not found', 404);
    return;
  }

  const users = await loadUsersByIds([transaction.created_by]);
  sendSuccess(res, { record: toFinancialRecord(transaction, users.get(transaction.created_by)) });
});

export const deleteRecord = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = parseRecordId(req.params.id, res);
  if (!id) return;

  const transaction = await softDeleteTransaction(id);

  if (!transaction) {
    sendError(res, 'Record not found', 404);
    return;
  }

  sendSuccess(res, { message: 'Record deleted successfully' });
});
