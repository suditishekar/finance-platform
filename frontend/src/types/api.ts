export type UserRole = 'admin' | 'analyst' | 'viewer';
export type TransactionType = 'income' | 'expense';

export interface User {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  status?: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface Transaction {
  _id: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  notes?: string;
  createdBy: string | Pick<User, '_id' | 'name' | 'email'>;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface LoginData {
  token: string;
  user: User;
}

export interface Summary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  incomeCount: number;
  expenseCount: number;
  totalRecords: number;
  transactionCount?: number;
  from?: string;
  to?: string;
}

export interface RecordsData {
  records: Transaction[];
  pagination: { total: number; page: number; limit: number; pages: number };
}

export interface DailySummaryRow {
  date: string;
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
  transactionCount: number;
}

export interface MonthlySummaryRow {
  month: string;
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
  transactionCount: number;
}

export interface CategoryAnalysisRow {
  category: string;
  totalAmount: number;
  transactionCount: number;
  income: { total: number; count: number };
  expense: { total: number; count: number };
}

export interface TrendRow {
  period: string;
  income: number;
  expense: number;
  net: number;
}
