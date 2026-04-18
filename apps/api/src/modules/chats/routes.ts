import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AuthVariables } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';
import { AGENTS } from './agents.js';
import { agentRouter } from './agent-router.js';
import {
  createChatSchema,
  createFolderSchema,
  foldersQuerySchema,
  listQuerySchema,
  moveChatSchema,
  patchChatSchema,
  patchFolderSchema,
  routePreviewSchema,
  streamMessageSchema,
} from './schemas.js';
import {
  createChat,
  createFolder,
  deleteChat,
  deleteFolder,
  getChat,
  listChats,
  listFolders,
  listMessages,
  moveChatToFolder,
  renameFolder,
  updateChat,
} from './service.js';
import { handleStreamMessage } from './stream.js';

export const chatsRouter = new Hono<{ Variables: AuthVariables }>();

// Folders (must register BEFORE /:id routes to avoid collision).
chatsRouter.get('/folders', zValidator('query', foldersQuerySchema), async (c) => {
  const user = c.get('user');
  const { project_id } = c.req.valid('query');
  const folders = await listFolders(user.id, project_id ?? null);
  return c.json(ok(folders));
});

chatsRouter.post('/folders', zValidator('json', createFolderSchema), async (c) => {
  const user = c.get('user');
  const input = c.req.valid('json');
  const folder = await createFolder({
    userId: user.id,
    projectId: input.project_id ?? null,
    name: input.name,
    color: input.color ?? null,
  });
  return c.json(ok(folder), 201);
});

chatsRouter.patch('/folders/:id', zValidator('json', patchFolderSchema), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const patch = c.req.valid('json');
  const folder = await renameFolder(id, user.id, patch);
  return c.json(ok(folder));
});

chatsRouter.delete('/folders/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  await deleteFolder(id, user.id);
  return c.json(ok({ deleted: true }));
});

chatsRouter.get('/', zValidator('query', listQuerySchema), async (c) => {
  const user = c.get('user');
  const { project_id, archived } = c.req.valid('query');
  const chats = await listChats(user.id, { projectId: project_id, archived });
  return c.json(ok(chats));
});

chatsRouter.post('/', zValidator('json', createChatSchema), async (c) => {
  const user = c.get('user');
  const input = c.req.valid('json');
  const ids = input.agent_ids ?? (input.agent_id ? [input.agent_id] : []);
  const validIds = ids.filter((id) => AGENTS.some((a) => a.id === id));
  if (validIds.length === 0) {
    return c.json({ ok: false, error: { code: 'INVALID_AGENT', message: 'Agent not found' } }, 400);
  }
  const chat = await createChat({
    userId: user.id,
    projectId: input.project_id ?? null,
    agentId: validIds[0]!,
    agentIds: validIds,
    title: input.title ?? null,
  });
  return c.json(ok(chat), 201);
});

chatsRouter.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const chat = await getChat(id, user.id);
  const messages = await listMessages(id, user.id);
  return c.json(ok({ ...chat, messages }));
});

chatsRouter.patch('/:id', zValidator('json', patchChatSchema), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const patch = c.req.valid('json');
  const chat = await updateChat(id, user.id, {
    title: patch.title ?? undefined,
    isArchived: patch.is_archived,
  });
  return c.json(ok(chat));
});

chatsRouter.patch('/:id/folder', zValidator('json', moveChatSchema), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const { folder_id } = c.req.valid('json');
  const chat = await moveChatToFolder(id, user.id, folder_id);
  return c.json(ok(chat));
});

chatsRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  await deleteChat(id, user.id);
  return c.json(ok({ deleted: true }));
});

chatsRouter.get('/:id/messages', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const messages = await listMessages(id, user.id);
  return c.json(ok(messages));
});

chatsRouter.post('/route-preview', zValidator('json', routePreviewSchema), async (c) => {
  const { message, agent_ids } = c.req.valid('json');
  const validIds = agent_ids.filter((id) => AGENTS.some((a) => a.id === id));
  if (validIds.length === 0) return c.json(ok(null));
  const decision = await agentRouter
    .route({ message, availableAgents: validIds })
    .catch(() => null);
  return c.json(ok(decision));
});

chatsRouter.post(
  '/:id/messages/stream',
  zValidator('json', streamMessageSchema),
  handleStreamMessage,
);

chatsRouter.get('/meta/agents', (c) => {
  return c.json(ok(AGENTS));
});
