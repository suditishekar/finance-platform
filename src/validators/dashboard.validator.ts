import { z } from 'zod';

const dateValue = z.preprocess(
  value => (typeof value === 'string' || typeof value === 'number' || value instanceof Date ? value : undefined),
  z.coerce.date({ invalid_type_error: 'Invalid date format' })
);

export const dashboardDateRangeSchema = z.object({
  from: dateValue,
  to: dateValue,
}).strict().refine(({ from, to }) => from <= to, {
  message: 'The from date must be before or equal to the to date',
  path: ['to'],
});

export const optionalDashboardDateRangeSchema = z.object({
  from: dateValue.optional(),
  to: dateValue.optional(),
}).strict().refine(({ from, to }) => !from || !to || from <= to, {
  message: 'The from date must be before or equal to the to date',
  path: ['to'],
});