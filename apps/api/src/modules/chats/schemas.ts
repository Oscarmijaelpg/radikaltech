import { z } from 'zod';

export const createChatSchema = z
  .object({
    agent_id: z.string().min(1).optional(),
    agent_ids: z.array(z.string().min(1)).min(1).max(5).optional(),
    project_id: z.string().uuid().optional(),
    title: z.string().max(200).optional(),
  })
  .refine((v) => !!v.agent_id || (v.agent_ids && v.agent_ids.length > 0), {
    message: 'agent_id or agent_ids required',
  });

export const patchChatSchema = z.object({
  title: z.string().max(200).nullish(),
  is_archived: z.boolean().optional(),
});

export const streamMessageSchema = z.object({
  content: z.string().min(1),
  target_agent_id: z.string().min(1).optional(),
});

export const listQuerySchema = z.object({
  project_id: z.string().uuid().optional(),
  archived: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

export const createFolderSchema = z.object({
  project_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(100),
  color: z.string().max(20).optional().nullable(),
});

export const patchFolderSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().max(20).nullish(),
});

export const moveChatSchema = z.object({
  folder_id: z.string().uuid().nullable(),
});

export const foldersQuerySchema = z.object({
  project_id: z.string().uuid().optional(),
});

export const routePreviewSchema = z.object({
  message: z.string().min(1),
  agent_ids: z.array(z.string().min(1)).min(1).max(5),
});
