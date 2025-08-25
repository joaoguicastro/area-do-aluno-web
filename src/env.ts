import { z } from 'zod';

const schema = z.object({
  VITE_API_URL: z.string().url(),
});

export const env = schema.parse(import.meta.env);
