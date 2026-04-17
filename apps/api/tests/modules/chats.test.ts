import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: { NODE_ENV: 'test', WEB_URL: 'http://localhost:3000', LOG_LEVEL: 'silent' },
}));

const chatFindMany = vi.fn();
const chatFindUnique = vi.fn();
const chatCreate = vi.fn();
const chatUpdate = vi.fn();
const chatDelete = vi.fn();
const chatUpdateMany = vi.fn();
const messageCreate = vi.fn();
const messageFindMany = vi.fn();
const projectFindUnique = vi.fn();
const folderFindUnique = vi.fn();
const folderCreate = vi.fn();
const folderFindMany = vi.fn();
const folderUpdate = vi.fn();
const folderDelete = vi.fn();

vi.mock('@radikal/db', () => ({
  prisma: {
    chat: {
      findMany: chatFindMany,
      findUnique: chatFindUnique,
      create: chatCreate,
      update: chatUpdate,
      delete: chatDelete,
      updateMany: chatUpdateMany,
    },
    message: { create: messageCreate, findMany: messageFindMany },
    project: { findUnique: projectFindUnique },
    projectFolder: {
      findUnique: folderFindUnique,
      create: folderCreate,
      findMany: folderFindMany,
      update: folderUpdate,
      delete: folderDelete,
    },
  },
}));

describe('chats service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listChats filters by projectId and archived=false by default', async () => {
    chatFindMany.mockResolvedValue([]);
    const { listChats } = await import('../../src/modules/chats/service.js');
    await listChats('u1', { projectId: 'p1' });
    const call = chatFindMany.mock.calls[0]?.[0] as { where: Record<string, unknown> };
    expect(call.where.userId).toBe('u1');
    expect(call.where.projectId).toBe('p1');
    expect(call.where.isArchived).toBe(false);
  });

  it('createChat asserts ownership when projectId supplied', async () => {
    projectFindUnique.mockResolvedValue({ id: 'p1', userId: 'other' });
    const { createChat } = await import('../../src/modules/chats/service.js');
    await expect(
      createChat({ userId: 'u1', projectId: 'p1', agentId: 'a1' }),
    ).rejects.toThrow();
  });

  it('createChat creates when no project or owned project', async () => {
    chatCreate.mockResolvedValue({ id: 'c1' });
    const { createChat } = await import('../../src/modules/chats/service.js');
    await createChat({ userId: 'u1', agentId: 'a1', title: 'T' });
    expect(chatCreate).toHaveBeenCalled();
    const data = (chatCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> }).data;
    expect(data.agentId).toBe('a1');
    expect(data.title).toBe('T');
  });

  it('archiveChat sets isArchived=true', async () => {
    chatFindUnique.mockResolvedValue({ id: 'c1', userId: 'u1' });
    chatUpdate.mockResolvedValue({ id: 'c1', isArchived: true });
    const { archiveChat } = await import('../../src/modules/chats/service.js');
    await archiveChat('c1', 'u1');
    const call = chatUpdate.mock.calls[0]?.[0] as { data: { isArchived: boolean } };
    expect(call.data.isArchived).toBe(true);
  });

  it('archiveChat throws Forbidden for other user', async () => {
    chatFindUnique.mockResolvedValue({ id: 'c1', userId: 'other' });
    const { archiveChat } = await import('../../src/modules/chats/service.js');
    await expect(archiveChat('c1', 'u1')).rejects.toThrow();
  });

  it('appendMessage creates message and bumps chat.updatedAt', async () => {
    messageCreate.mockResolvedValue({ id: 'm1' });
    chatUpdate.mockResolvedValue({ id: 'c1' });
    const { appendMessage } = await import('../../src/modules/chats/service.js');
    await appendMessage({
      chatId: 'c1',
      userId: 'u1',
      role: 'user' as never,
      content: 'hi',
    });
    expect(messageCreate).toHaveBeenCalled();
    expect(chatUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c1' } }),
    );
  });

  it('moveChatToFolder validates folder ownership', async () => {
    chatFindUnique.mockResolvedValue({ id: 'c1', userId: 'u1' });
    folderFindUnique.mockResolvedValue({ id: 'f1', userId: 'other' });
    const { moveChatToFolder } = await import('../../src/modules/chats/service.js');
    await expect(moveChatToFolder('c1', 'u1', 'f1')).rejects.toThrow();
  });

  it('moveChatToFolder with null clears folder', async () => {
    chatFindUnique.mockResolvedValue({ id: 'c1', userId: 'u1' });
    chatUpdate.mockResolvedValue({ id: 'c1', folderId: null });
    const { moveChatToFolder } = await import('../../src/modules/chats/service.js');
    await moveChatToFolder('c1', 'u1', null);
    const call = chatUpdate.mock.calls[0]?.[0] as { data: { folderId: string | null } };
    expect(call.data.folderId).toBeNull();
  });

  it('createFolder creates with name/color', async () => {
    folderCreate.mockResolvedValue({ id: 'f1' });
    const { createFolder } = await import('../../src/modules/chats/service.js');
    await createFolder({ userId: 'u1', name: 'work', color: '#abc' });
    const data = (folderCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> }).data;
    expect(data.name).toBe('work');
    expect(data.color).toBe('#abc');
  });

  it('deleteFolder moves chats out then deletes', async () => {
    folderFindUnique.mockResolvedValue({ id: 'f1', userId: 'u1' });
    const { deleteFolder } = await import('../../src/modules/chats/service.js');
    await deleteFolder('f1', 'u1');
    expect(chatUpdateMany).toHaveBeenCalledWith({
      where: { folderId: 'f1' },
      data: { folderId: null },
    });
    expect(folderDelete).toHaveBeenCalled();
  });
});
