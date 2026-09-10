import { z } from 'zod';

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(['admin', 'analyst', 'viewer']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
}).strict().refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});
