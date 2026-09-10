import { Request, Response } from 'express';
import { sendError, sendSuccess } from '../utils/response';
import catchAsync from '../utils/catchAsync';
import {
  getCategoryAnalysis,
  getDailySummary as getDailySummaryRows,
  getMonthlySummary as getMonthlySummaryRows,
  findRecentTransactions,
  getCategoryTotals,
  getMonthlyTotals,
  getSummary as getTransactionSummary,
  getTrendAnalysis,
} from '../models/Transaction';
import { loadUsersByIds, toFinancialRecord } from '../utils/transactionResponse';
import {
  dashboardDateRangeSchema,
  optionalDashboardDateRangeSchema,
} from '../validators/dashboard.validator';

const parseDateRange = (
  query: unknown,
  required: boolean,
  res: Response
): { from: Date; to: Date } | null => {
  const parsed = (required ? dashboardDateRangeSchema : optionalDashboardDateRangeSchema).safeParse(query);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return null;
  }

  if (!required && (!parsed.data.from || !parsed.data.to)) {
    sendError(res, 'Both from and to dates are required when filtering by date range', 422);
    return null;
  }

  const from = new Date(parsed.data.from!);
  const to = new Date(parsed.data.to!);
  from.setUTCHours(0, 0, 0, 0);
  to.setUTCHours(23, 59, 59, 999);
  return { from, to };
};

export const getSummary = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const hasDateRange = req.query.from !== undefined || req.query.to !== undefined;
  const range = hasDateRange ? parseDateRange(req.query, false, res) : undefined;
  if (hasDateRange && !range) return;

  const result = await getTransactionSummary(range ?? undefined);

  let totalIncome = 0;
  let totalExpenses = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  for (const row of result) {
    if (row.type === 'income') {
      totalIncome = Number(row.total);
      incomeCount = row.count;
    } else if (row.type === 'expense') {
      totalExpenses = Number(row.total);
      expenseCount = row.count;
    }
  }

  sendSuccess(res, {
    totalIncome,
    totalExpenses,
    netBalance: totalIncome - totalExpenses,
    incomeCount,
    expenseCount,
    totalRecords: incomeCount + expenseCount,
    transactionCount: incomeCount + expenseCount,
    ...(range ? { from: range.from.toISOString(), to: range.to.toISOString() } : {}),
  });
});

export const getByCategory = catchAsync(async (_req: Request, res: Response): Promise<void> => {
  const result = await getCategoryTotals();

  // shape into { income: [...], expense: [...] }
  const byCategory: Record<string, unknown[]> = { income: [], expense: [] };
  for (const row of result) {
    byCategory[row.type].push({
      category: row.category,
      total: Number(row.total),
      count: row.count,
    });
  }

  sendSuccess(res, { byCategory });
});

export const getDailySummary = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const range = parseDateRange(req.query, true, res);
  if (!range) return;

  const rows = await getDailySummaryRows(range);
  sendSuccess(res, {
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    summaries: rows.map(row => ({
      date: row.date,
      totalIncome: Number(row.total_income),
      totalExpense: Number(row.total_expense),
      netAmount: Number(row.net_amount),
      transactionCount: row.transaction_count,
    })),
  });
});

export const getMonthlySummary = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const range = parseDateRange(req.query, true, res);
  if (!range) return;

  const rows = await getMonthlySummaryRows(range);
  sendSuccess(res, {
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    summaries: rows.map(row => ({
      month: row.month,
      totalIncome: Number(row.total_income),
      totalExpense: Number(row.total_expense),
      netAmount: Number(row.net_amount),
      transactionCount: row.transaction_count,
    })),
  });
});

export const getCategoryAnalysisReport = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const range = parseDateRange(req.query, true, res);
  if (!range) return;

  const rows = await getCategoryAnalysis(range);
  sendSuccess(res, {
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    categories: rows.map(row => ({
      category: row.category,
      totalAmount: Number(row.total_amount),
      transactionCount: row.transaction_count,
      income: { total: Number(row.income_total), count: row.income_count },
      expense: { total: Number(row.expense_total), count: row.expense_count },
    })),
  });
});

export const getTrendAnalysisReport = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const range = parseDateRange(req.query, true, res);
  if (!range) return;

  const rows = await getTrendAnalysis(range);
  sendSuccess(res, {
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    trends: rows.map(row => ({
      period: row.period,
      income: Number(row.income),
      expense: Number(row.expense),
      net: Number(row.net),
    })),
  });
});

export const getMonthlyTrends = catchAsync(async (req: Request, res: Response): Promise<void> => {
  // default: last 6 months
  const months = Math.min(parseInt(req.query.months as string) || 6, 24);
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const result = await getMonthlyTotals(since);

  // reshape into array of { year, month, income, expense }
  const map = new Map<string, Record<string, number>>();
  for (const row of result) {
    const key = `${row.year}-${String(row.month).padStart(2, '0')}`;
    if (!map.has(key)) map.set(key, { year: row.year, month: row.month, income: 0, expense: 0 });
    map.get(key)![row.type] = Number(row.total);
  }

  const trends = Array.from(map.values()).map(m => ({
    ...m,
    net: (m.income ?? 0) - (m.expense ?? 0),
  }));

  sendSuccess(res, { months, trends });
});

export const getRecentActivity = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

  const rows = await findRecentTransactions(limit);
  const users = await loadUsersByIds(rows.map(row => row.created_by));
  const records = rows.map(row => toFinancialRecord(row, users.get(row.created_by)));

  sendSuccess(res, { records });
});
