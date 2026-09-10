import User, { IUser } from '../models/User';
import { TransactionRow } from '../models/Transaction';

export interface FinancialRecordResponse {
  _id: string;
  amount: number;
  type: TransactionRow['type'];
  category: string;
  date: Date;
  notes?: string;
  createdBy: string | Pick<IUser, '_id' | 'name' | 'email'>;
  createdAt: Date;
  updatedAt: Date;
}

export const loadUsersByIds = async (ids: string[]): Promise<Map<string, IUser>> => {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return new Map();

  const users = await User.find({ _id: { $in: uniqueIds } }).select('name email');
  return new Map(users.map(user => [String(user._id), user]));
};

export const toFinancialRecord = (
  row: TransactionRow,
  user?: IUser
): FinancialRecordResponse => ({
  _id: row.id,
  amount: Number(row.amount),
  type: row.type,
  category: row.category,
  date: row.transaction_date,
  ...(row.description ? { notes: row.description } : {}),
  createdBy: user
    ? { _id: user._id, name: user.name, email: user.email }
    : row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});