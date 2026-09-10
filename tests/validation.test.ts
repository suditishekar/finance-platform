import { describe, expect, it } from 'vitest';
import { dashboardDateRangeSchema } from '../src/validators/dashboard.validator';
import { reconciliationSchema } from '../src/validators/reconciliation.validator';
import { createRecordSchema, recordIdSchema, recordQuerySchema } from '../src/validators/record.validator';
import { registerSchema } from '../src/validators/auth.validator';
import { createUserSchema } from '../src/validators/admin-user.validator';
import { updateUserSchema } from '../src/validators/user.validator';

const validId = '11111111-1111-4111-8111-111111111111';

describe('transaction validation', () => {
  it('accepts a valid create payload and rejects invalid transaction fields', () => {
    expect(createRecordSchema.safeParse({ amount: 100, type: 'income', category: 'Salary', date: '2026-01-01' }).success).toBe(true);
    expect(createRecordSchema.safeParse({ amount: 0, type: 'income', category: 'Salary', date: '2026-01-01' }).success).toBe(false);
    expect(createRecordSchema.safeParse({ amount: 100, type: 'transfer', category: 'Salary', date: '2026-01-01' }).success).toBe(false);
    expect(createRecordSchema.safeParse({ amount: 100, type: 'income', category: ' ', date: '2026-01-01' }).success).toBe(false);
    expect(createRecordSchema.safeParse({ amount: 100, type: 'income', category: 'Salary', date: 'not-a-date' }).success).toBe(false);
  });

  it('validates filters, pagination, UUIDs, and rejects metadata fields', () => {
    expect(recordQuerySchema.safeParse({ page: '0', limit: '20' }).success).toBe(false);
    expect(recordQuerySchema.safeParse({ type: 'other', page: '1', limit: '20' }).success).toBe(false);
    expect(recordIdSchema.safeParse(validId).success).toBe(true);
    expect(recordIdSchema.safeParse('not-a-uuid').success).toBe(false);
    expect(createRecordSchema.safeParse({ amount: 100, type: 'income', category: 'Salary', date: '2026-01-01', id: validId }).success).toBe(false);
  });
});

describe('analytics and reconciliation validation', () => {
  it('rejects malformed and reversed analytics ranges', () => {
    expect(dashboardDateRangeSchema.safeParse({ from: '2026-02-01', to: '2026-01-01' }).success).toBe(false);
    expect(dashboardDateRangeSchema.safeParse({ from: 'invalid', to: '2026-01-01' }).success).toBe(false);
  });

  it('rejects duplicate or database-incompatible reference transactions', () => {
    const item = { id: validId, amount: 100, type: 'income', category: 'Salary' };
    expect(reconciliationSchema.safeParse({ referenceTransactions: [item, item] }).success).toBe(false);
    expect(reconciliationSchema.safeParse({ referenceTransactions: [{ ...item, amount: 100.123 }] }).success).toBe(false);
  });
});

describe('registration validation', () => {
  it('rejects client-controlled roles', () => {
    expect(registerSchema.safeParse({ name: 'New User', email: 'new@example.com', password: 'secret123' }).success).toBe(true);
    expect(registerSchema.safeParse({ name: 'New User', email: 'new@example.com', password: 'secret123', role: 'admin' }).success).toBe(false);
  });
});

describe('admin user-management validation', () => {
  it('allows only supported roles and fields for admin user mutations', () => {
    const user = { name: 'Finance Analyst', email: 'analyst@example.com', password: 'secret123', role: 'analyst' };
    expect(createUserSchema.safeParse(user).success).toBe(true);
    expect(createUserSchema.safeParse({ ...user, role: 'owner' }).success).toBe(false);
    expect(createUserSchema.safeParse({ ...user, status: 'active' }).success).toBe(false);
    expect(updateUserSchema.safeParse({ status: 'inactive' }).success).toBe(true);
    expect(updateUserSchema.safeParse({ password: 'new-secret' }).success).toBe(false);
  });
});
