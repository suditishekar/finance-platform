import { useEffect, useRef, useState } from 'react';

export interface DateRange {
  from: string;
  to: string;
  label: string;
}

type Preset = { label: string; getRange: () => DateRange };

const isoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const monthLabel = (date: Date): string => new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
const startOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth() + 1, 0);

export const currentMonthRange = (): DateRange => {
  const now = new Date();
  return { from: isoDate(startOfMonth(now)), to: isoDate(endOfMonth(now)), label: monthLabel(now) };
};

const presets = (): Preset[] => [
  { label: 'Current month', getRange: currentMonthRange },
  { label: 'Previous month', getRange: () => { const date = new Date(); date.setMonth(date.getMonth() - 1); return { from: isoDate(startOfMonth(date)), to: isoDate(endOfMonth(date)), label: monthLabel(date) }; } },
  { label: 'Previous 3 months', getRange: () => { const now = new Date(); const from = new Date(now.getFullYear(), now.getMonth() - 2, 1); return { from: isoDate(from), to: isoDate(endOfMonth(now)), label: 'Previous 3 months' }; } },
  { label: 'Previous 6 months', getRange: () => { const now = new Date(); const from = new Date(now.getFullYear(), now.getMonth() - 5, 1); return { from: isoDate(from), to: isoDate(endOfMonth(now)), label: 'Previous 6 months' }; } },
  { label: 'Year to date', getRange: () => { const now = new Date(); return { from: isoDate(new Date(now.getFullYear(), 0, 1)), to: isoDate(now), label: `Year to date · ${now.getFullYear()}` }; } },
];

interface PeriodSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  compact?: boolean;
}

export function PeriodSelector({ value, onChange, compact = false }: PeriodSelectorProps) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState({ from: value.from, to: value.to });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape); };
  }, []);

  const choose = (range: DateRange) => { onChange(range); setCustom({ from: range.from, to: range.to }); setOpen(false); };
  const customValid = custom.from && custom.to && custom.from <= custom.to;

  return <div className={`period-selector ${compact ? 'compact' : ''}`} ref={ref}>
    <button className="period-trigger" type="button" onClick={() => setOpen(current => !current)} aria-expanded={open} aria-haspopup="dialog"><span className="period-icon" aria-hidden="true">◷</span><span>{value.label}</span><span className="period-chevron" aria-hidden="true">⌄</span></button>
    {open && <div className="period-popover" role="dialog" aria-label="Select date range"><span className="popover-label">Date range</span><div className="period-options">{presets().map(preset => <button key={preset.label} className={value.label === preset.label ? 'period-option selected' : 'period-option'} type="button" onClick={() => choose(preset.getRange())}>{preset.label}<span aria-hidden="true">›</span></button>)}</div><div className="custom-range"><span className="popover-label">Custom range</span><div className="custom-fields"><label>From<input type="date" value={custom.from} onChange={event => setCustom(current => ({ ...current, from: event.target.value }))} /></label><label>To<input type="date" value={custom.to} onChange={event => setCustom(current => ({ ...current, to: event.target.value }))} /></label></div><button className="text-button" type="button" disabled={!customValid} onClick={() => choose({ ...custom, label: `${custom.from} – ${custom.to}` })}>Apply custom range</button></div></div>}
  </div>;
}
