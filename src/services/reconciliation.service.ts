import type { TransactionType } from '../models/Transaction';

export interface ReconciliationInternalRecord {
  id: string;
  amount: string | number;
  type: TransactionType;
  category: string;
}

export interface ReconciliationReferenceRecord {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
}

export interface ReconciliationMismatch {
  id: string;
  internal: ReconciliationInternalRecord;
  external: ReconciliationReferenceRecord;
  differences: Array<'amount' | 'type' | 'category'>;
}

export interface ReconciliationResult {
  summary: {
    totalInternalRecords: number;
    totalExternalRecords: number;
    matchedCount: number;
    missingInternally: number;
    missingExternally: number;
    mismatchedCount: number;
  };
  matched: string[];
  missingInternally: ReconciliationReferenceRecord[];
  missingExternally: ReconciliationInternalRecord[];
  mismatched: ReconciliationMismatch[];
}

const normalizedAmount = (amount: string | number): string => Number(amount).toFixed(2);
const sameAmount = (internal: string | number, external: number): boolean => normalizedAmount(internal) === normalizedAmount(external);

export const reconcileTransactions = (
  internalRecords: ReconciliationInternalRecord[],
  referenceRecords: ReconciliationReferenceRecord[]
): ReconciliationResult => {
  const internalById = new Map(internalRecords.map(record => [record.id, record]));
  const referenceById = new Map(referenceRecords.map(record => [record.id, record]));
  const matched: string[] = [];
  const missingInternally: ReconciliationReferenceRecord[] = [];
  const mismatched: ReconciliationMismatch[] = [];

  for (const external of referenceRecords) {
    const internal = internalById.get(external.id);
    if (!internal) {
      missingInternally.push(external);
      continue;
    }

    const differences: ReconciliationMismatch['differences'] = [];
    if (!sameAmount(internal.amount, external.amount)) differences.push('amount');
    if (internal.type !== external.type) differences.push('type');
    if (internal.category !== external.category) differences.push('category');

    if (differences.length === 0) matched.push(external.id);
    else mismatched.push({ id: external.id, internal, external, differences });
  }

  const missingExternally = internalRecords.filter(record => !referenceById.has(record.id));

  return {
    summary: {
      totalInternalRecords: internalRecords.length,
      totalExternalRecords: referenceRecords.length,
      matchedCount: matched.length,
      missingInternally: missingInternally.length,
      missingExternally: missingExternally.length,
      mismatchedCount: mismatched.length,
    },
    matched,
    missingInternally,
    missingExternally,
    mismatched,
  };
};
