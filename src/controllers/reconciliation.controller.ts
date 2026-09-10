import { Request, Response } from 'express';
import { findTransactionsForReconciliation } from '../models/Transaction';
import { sendError, sendSuccess } from '../utils/response';
import { reconciliationSchema } from '../validators/reconciliation.validator';
import { reconcileTransactions } from '../services/reconciliation.service';
import catchAsync from '../utils/catchAsync';

export const compareReconciliation = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const parsed = reconciliationSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const internalRecords = await findTransactionsForReconciliation();
  const result = reconcileTransactions(internalRecords, parsed.data.referenceTransactions);
  sendSuccess(res, result);
});
