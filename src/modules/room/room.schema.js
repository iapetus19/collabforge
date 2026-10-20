import { z } from 'zod';

export const createRoomSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, 'Room name must be at least 2 characters')
      .max(50, 'Room name cannot exceed 50 characters'),
    language: z
      .enum(['javascript', 'typescript', 'python', 'cpp', 'java', 'go', 'rust'])
      .optional()
      .default('javascript'),
  }),
});

export const updateRoomCodeSchema = z.object({
  body: z.object({
    code: z.string(),
    language: z
      .enum(['javascript', 'typescript', 'python', 'cpp', 'java', 'go', 'rust'])
      .optional(),
  }),
});
