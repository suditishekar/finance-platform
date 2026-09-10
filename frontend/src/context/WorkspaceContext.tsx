import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'Indian rupee' },
  { code: 'USD', symbol: '$', label: 'US dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British pound' },
  { code: 'JPY', symbol: '¥', label: 'Japanese yen' },
  { code: 'AED', symbol: 'د.إ', label: 'UAE dirham' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore dollar' },
  { code: 'AUD', symbol: 'A$', label: 'Australian dollar' },
] as const;

export type CurrencyCode = typeof CURRENCIES[number]['code'];
const CURRENCY_KEY = 'zorvyn.workspace.currency';
const DEFAULT_CURRENCY: CurrencyCode = 'INR';

interface WorkspaceContextValue {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  formatCurrency: (amount: number, options?: Intl.NumberFormatOptions) => string;
  currencySymbol: string;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

const storedCurrency = (): CurrencyCode => {
  const value = localStorage.getItem(CURRENCY_KEY) as CurrencyCode | null;
  return CURRENCIES.some(currency => currency.code === value) ? value! : DEFAULT_CURRENCY;
};

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(storedCurrency);
  const selected = CURRENCIES.find(item => item.code === currency) || CURRENCIES[0];

  const setCurrency = (nextCurrency: CurrencyCode) => {
    localStorage.setItem(CURRENCY_KEY, nextCurrency);
    setCurrencyState(nextCurrency);
  };

  const value = useMemo(() => ({
    currency,
    setCurrency,
    currencySymbol: selected.symbol,
    formatCurrency: (amount: number, options: Intl.NumberFormatOptions = {}) => new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
      ...options,
    }).format(amount),
  }), [currency, selected.symbol]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return context;
}
