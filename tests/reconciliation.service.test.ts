import { describe, expect, it } from 'vitest';
import { reconcileTransactions, type ReconciliationInternalRecord, type ReconciliationReferenceRecord } from '../src/services/reconciliation.service';

const internal = (overrides: Partial<ReconciliationInternalRecord> = {}): ReconciliationInternalRecord => ({
  id: '11111111-1111-4111-8111-111111111111', amount: '100.00', type: 'expense', category: 'Food', ...overrides,
});
const reference = (overrides: Partial<ReconciliationReferenceRecord> = {}): ReconciliationReferenceRecord => ({
  id: '11111111-1111-4111-8111-111111111111', amount: 100, type: 'expense', category: 'Food', ...overrides,
});

describe('reconcileTransactions', () => {
  it('matches equivalent records without mutating inputs', () => {
    const internalRecords = [internal()];
    const referenceRecords = [reference()];
    const result = reconcileTransactions(internalRecords, referenceRecords);
    expect(result.summary).toEqual({ totalInternalRecords: 1, totalExternalRecords: 1, matchedCount: 1, missingInternally: 0, missingExternally: 0, mismatchedCount: 0 });
    expect(result.matched).toEqual([internalRecords[0].id]);
    expect(internalRecords).toEqual([internal()]);
  });

  it('reports missing internal and external records', () => {
    const internalOnly = internal({ id: '22222222-2222-4222-8222-222222222222' });
    const externalOnly = reference({ id: '33333333-3333-4333-8333-333333333333' });
    const result = reconcileTransactions([internalOnly], [externalOnly]);
    expect(result.summary.missingInternally).toBe(1);
    expect(result.summary.missingExternally).toBe(1);
    expect(result.missingInternally).toEqual([externalOnly]);
    expect(result.missingExternally).toEqual([internalOnly]);
  });

  it('reports all meaningful field mismatches together', () => {
    const result = reconcileTransactions([internal()], [reference({ amount: 101, type: 'income', category: 'Travel' })]);
    expect(result.summary.mismatchedCount).toBe(1);
    expect(result.mismatched[0].differences).toEqual(['amount', 'type', 'category']);
  });

  it('does not treat harmless decimal representation as an amount mismatch', () => {
    const result = reconcileTransactions([internal({ amount: '100.10' })], [reference({ amount: 100.1 })]);
    expect(result.summary.matchedCount).toBe(1);
  });
});
