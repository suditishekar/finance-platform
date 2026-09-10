import postgresPool from '../config/postgres';

export type TransactionType = 'income' | 'expense';

export interface TransactionRow {
  id: string;
  amount: string;
  type: TransactionType;
  category: string;
  description: string | null;
  transaction_date: Date;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface TransactionInput {
  amount: number;
  type: TransactionType;
  category: string;
  description?: string;
  transactionDate: Date;
  createdBy: string;
}

export interface TransactionFilters {
  type?: TransactionType;
  category?: string;
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
}

export interface AnalyticsDateRange {
  from: Date;
  to: Date;
}

export interface DailySummaryRow {
  date: string;
  total_income: string;
  total_expense: string;
  net_amount: string;
  transaction_count: number;
}

export interface MonthlySummaryRow {
  month: string;
  total_income: string;
  total_expense: string;
  net_amount: string;
  transaction_count: number;
}

export interface CategoryAnalysisRow {
  category: string;
  total_amount: string;
  transaction_count: number;
  income_total: string;
  income_count: number;
  expense_total: string;
  expense_count: number;
}

export interface TrendRow {
  period: string;
  income: string;
  expense: string;
  net: string;
}

export interface ReconciliationRow {
  id: string;
  amount: string;
  type: TransactionType;
  category: string;
}

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const activeWhere = (filters: TransactionFilters): { clause: string; values: unknown[] } => {
  const conditions = ['deleted_at IS NULL'];
  const values: unknown[] = [];

  if (filters.type) {
    values.push(filters.type);
    conditions.push(`type = $${values.length}`);
  }
  if (filters.category) {
    values.push(`%${filters.category}%`);
    conditions.push(`category ILIKE $${values.length}`);
  }
  if (filters.from) {
    values.push(filters.from);
    conditions.push(`transaction_date >= $${values.length}`);
  }
  if (filters.to) {
    values.push(filters.to);
    conditions.push(`transaction_date <= $${values.length}`);
  }

  return { clause: conditions.join(' AND '), values };
};

export const createTransaction = async (input: TransactionInput): Promise<TransactionRow> => {
  const result = await postgresPool.query<TransactionRow>(
    `INSERT INTO transactions
      (amount, type, category, description, transaction_date, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [input.amount, input.type, input.category, input.description ?? null, input.transactionDate, input.createdBy]
  );

  return result.rows[0];
};

export const findTransactions = async (
  filters: TransactionFilters
): Promise<{ rows: TransactionRow[]; total: number }> => {
  const { clause, values } = activeWhere(filters);
  const offset = (filters.page - 1) * filters.limit;

  const [rowsResult, countResult] = await Promise.all([
    postgresPool.query<TransactionRow>(
      `SELECT * FROM transactions WHERE ${clause}
       ORDER BY transaction_date DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, filters.limit, offset]
    ),
    postgresPool.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM transactions WHERE ${clause}`,
      values
    ),
  ]);

  return { rows: rowsResult.rows, total: Number(countResult.rows[0].total) };
};

export const findTransactionById = async (id: string): Promise<TransactionRow | null> => {
  if (!isUuid(id)) return null;

  const result = await postgresPool.query<TransactionRow>(
    'SELECT * FROM transactions WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  return result.rows[0] ?? null;
};

export const updateTransaction = async (
  id: string,
  data: Partial<Omit<TransactionInput, 'createdBy'>>
): Promise<TransactionRow | null> => {
  if (!isUuid(id)) return null;

  const fields: string[] = [];
  const values: unknown[] = [];
  const addField = (column: string, value: unknown): void => {
    values.push(value);
    fields.push(`${column} = $${values.length}`);
  };

  if (data.amount !== undefined) addField('amount', data.amount);
  if (data.type !== undefined) addField('type', data.type);
  if (data.category !== undefined) addField('category', data.category);
  if (data.description !== undefined) addField('description', data.description);
  if (data.transactionDate !== undefined) addField('transaction_date', data.transactionDate);
  if (fields.length === 0) return findTransactionById(id);

  values.push(id);
  const result = await postgresPool.query<TransactionRow>(
    `UPDATE transactions SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${values.length} AND deleted_at IS NULL RETURNING *`,
    values
  );
  return result.rows[0] ?? null;
};

export const softDeleteTransaction = async (id: string): Promise<TransactionRow | null> => {
  if (!isUuid(id)) return null;

  const result = await postgresPool.query<TransactionRow>(
    `UPDATE transactions SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
    [id]
  );
  return result.rows[0] ?? null;
};

export const getSummary = async (
  range?: AnalyticsDateRange
): Promise<Array<{ type: TransactionType; total: string; count: number }>> => {
  const where = range
    ? { clause: 'deleted_at IS NULL AND transaction_date >= $1 AND transaction_date <= $2', values: [range.from, range.to] }
    : { clause: 'deleted_at IS NULL', values: [] as Date[] };
  const result = await postgresPool.query<{ type: TransactionType; total: string; count: number }>(
    `SELECT type, SUM(amount)::text AS total, COUNT(*)::int AS count
     FROM transactions WHERE ${where.clause} GROUP BY type`,
    where.values
  );
  return result.rows;
};

export const getCategoryTotals = async (): Promise<Array<{ type: TransactionType; category: string; total: string; count: number }>> => {
  const result = await postgresPool.query<{ type: TransactionType; category: string; total: string; count: number }>(
    `SELECT type, category, SUM(amount)::text AS total, COUNT(*)::int AS count
     FROM transactions WHERE deleted_at IS NULL
     GROUP BY type, category ORDER BY SUM(amount) DESC`
  );
  return result.rows;
};

export const getMonthlyTotals = async (since: Date): Promise<Array<{ year: number; month: number; type: TransactionType; total: string }>> => {
  const result = await postgresPool.query<{ year: number; month: number; type: TransactionType; total: string }>(
    `SELECT EXTRACT(YEAR FROM transaction_date)::int AS year,
            EXTRACT(MONTH FROM transaction_date)::int AS month,
            type, SUM(amount)::text AS total
     FROM transactions
     WHERE deleted_at IS NULL AND transaction_date >= $1
     GROUP BY year, month, type ORDER BY year, month`,
    [since]
  );
  return result.rows;
};

export const findRecentTransactions = async (limit: number): Promise<TransactionRow[]> => {
  const result = await postgresPool.query<TransactionRow>(
    `SELECT * FROM transactions WHERE deleted_at IS NULL
     ORDER BY transaction_date DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
};

const analyticsWhere = (range: AnalyticsDateRange): { clause: string; values: Date[] } => ({
  clause: 'deleted_at IS NULL AND transaction_date >= $1 AND transaction_date <= $2',
  values: [range.from, range.to],
});

export const getDailySummary = async (range: AnalyticsDateRange): Promise<DailySummaryRow[]> => {
  const { clause, values } = analyticsWhere(range);
  const result = await postgresPool.query<DailySummaryRow>(
    `SELECT transaction_date::date::text AS date,
            COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0)::text AS total_income,
            COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0)::text AS total_expense,
            COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0)
              - COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS net_amount,
            COUNT(*)::int AS transaction_count
     FROM transactions
     WHERE ${clause}
     GROUP BY transaction_date::date
     ORDER BY transaction_date::date`,
    values
  );
  return result.rows;
};

export const getMonthlySummary = async (range: AnalyticsDateRange): Promise<MonthlySummaryRow[]> => {
  const { clause, values } = analyticsWhere(range);
  const result = await postgresPool.query<MonthlySummaryRow>(
    `SELECT TO_CHAR(DATE_TRUNC('month', transaction_date), 'YYYY-MM') AS month,
            COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0)::text AS total_income,
            COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0)::text AS total_expense,
            COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0)
              - COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS net_amount,
            COUNT(*)::int AS transaction_count
     FROM transactions
     WHERE ${clause}
     GROUP BY DATE_TRUNC('month', transaction_date)
     ORDER BY DATE_TRUNC('month', transaction_date)`,
    values
  );
  return result.rows;
};

export const getCategoryAnalysis = async (range: AnalyticsDateRange): Promise<CategoryAnalysisRow[]> => {
  const { clause, values } = analyticsWhere(range);
  const result = await postgresPool.query<CategoryAnalysisRow>(
    `SELECT category,
            SUM(amount)::text AS total_amount,
            COUNT(*)::int AS transaction_count,
            COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0)::text AS income_total,
            COUNT(*) FILTER (WHERE type = 'income')::int AS income_count,
            COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0)::text AS expense_total,
            COUNT(*) FILTER (WHERE type = 'expense')::int AS expense_count
     FROM transactions
     WHERE ${clause}
     GROUP BY category
     ORDER BY SUM(amount) DESC, category ASC`,
    values
  );
  return result.rows;
};

export const getTrendAnalysis = async (range: AnalyticsDateRange): Promise<TrendRow[]> => {
  const { clause, values } = analyticsWhere(range);
  const result = await postgresPool.query<TrendRow>(
    `SELECT transaction_date::date::text AS period,
            COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0)::text AS income,
            COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0)::text AS expense,
            COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0)
              - COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS net
     FROM transactions
     WHERE ${clause}
     GROUP BY transaction_date::date
     ORDER BY transaction_date::date`,
    values
  );
  return result.rows;
};

export const findTransactionsForReconciliation = async (): Promise<ReconciliationRow[]> => {
  const result = await postgresPool.query<ReconciliationRow>(
    `SELECT id, amount::text, type, category
     FROM transactions
     WHERE deleted_at IS NULL
     ORDER BY id`
  );
  return result.rows;
};