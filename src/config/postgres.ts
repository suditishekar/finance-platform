import { Pool } from 'pg';

const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;

export const postgresPool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

export const initializePostgres = async (): Promise<void> => {
  if (!connectionString) {
    throw new Error('POSTGRES_URL or DATABASE_URL is not defined in environment variables');
  }

  await postgresPool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
      type VARCHAR(7) NOT NULL CHECK (type IN ('income', 'expense')),
      category TEXT NOT NULL,
      description TEXT,
      transaction_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by VARCHAR(24) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS transactions_transaction_date_idx
      ON transactions (transaction_date DESC) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS transactions_type_idx
      ON transactions (type) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS transactions_category_idx
      ON transactions (category) WHERE deleted_at IS NULL;
  `);
};

export default postgresPool;