import { z } from 'zod';

export const databaseSchema = z.object({
  projectId: z.string().min(1),
  instanceId: z.string().min(1),
  database: z.string().min(1),
});

export const spalidateSchema = z
  .object({
    command: z.string().min(1).optional(),
    args: z.array(z.string()).optional(),
    env: z.record(z.string(), z.string()).optional(),
    spawnOptions: z.any().optional(),
    workingDirectory: z.string().optional(),
  })
  .optional();

export const configSchema = z.object({
  schemaFile: z.string().min(1),
  expectedData: z.string().min(1).optional(),
  database: databaseSchema,
  spalidate: spalidateSchema,
});
