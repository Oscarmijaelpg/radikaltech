import { prisma, type MessageRole } from '@radikal/db';
import { Forbidden, NotFound } from '../../lib/errors.js';

export async function listChats(userId: string, opts: { projectId?: string; archived?: boolean } = {}) {
  return prisma.chat.findMany({
    where: {
      userId,
      ...(opts.projectId ? { projectId: opts.projectId } : {}),
      isArchived: opts.archived ?? false,
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getChat(id: string, userId: string) {
  const chat = await prisma.chat.findUnique({ where: { id } });
  if (!chat) throw new NotFound('Chat not found');
  if (chat.userId !== userId) throw new Forbidden();
  return chat;
}

export async function createChat(params: {
  userId: string;
  projectId?: string | null;
  agentId: string;
  agentIds?: string[];
  title?: string | null;
}) {
  if (params.projectId) {
    const project = await prisma.project.findUnique({ where: { id: params.projectId } });
    if (!project) throw new NotFound('Project not found');
    if (project.userId !== params.userId) throw new Forbidden();
  }
  const ids = params.agentIds && params.agentIds.length > 0 ? params.agentIds : [params.agentId];
  return prisma.chat.create({
    data: {
      userId: params.userId,
      projectId: params.projectId ?? null,
      agentId: ids[0],
      agentIds: ids,
      title: params.title ?? null,
    },
  });
}

export async function updateChat(
  id: string,
  userId: string,
  patch: { title?: string | null; isArchived?: boolean },
) {
  await getChat(id, userId);
  return prisma.chat.update({
    where: { id },
    data: {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.isArchived !== undefined ? { isArchived: patch.isArchived } : {}),
    },
  });
}

export async function archiveChat(id: string, userId: string) {
  return updateChat(id, userId, { isArchived: true });
}

export async function deleteChat(id: string, userId: string) {
  await getChat(id, userId);
  await prisma.chat.delete({ where: { id } });
}

export async function listMessages(chatId: string, userId: string, limit?: number) {
  await getChat(chatId, userId);
  return prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: 'asc' },
    ...(limit ? { take: limit } : {}),
  });
}

// ---------- Folders ----------

export async function listFolders(userId: string, projectId?: string | null) {
  return prisma.projectFolder.findMany({
    where: {
      userId,
      ...(projectId ? { projectId } : {}),
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createFolder(params: {
  userId: string;
  projectId?: string | null;
  name: string;
  color?: string | null;
}) {
  if (params.projectId) {
    const project = await prisma.project.findUnique({ where: { id: params.projectId } });
    if (!project) throw new NotFound('Project not found');
    if (project.userId !== params.userId) throw new Forbidden();
  }
  return prisma.projectFolder.create({
    data: {
      userId: params.userId,
      projectId: params.projectId ?? null,
      name: params.name,
      color: params.color ?? null,
    },
  });
}

async function getFolderOrThrow(id: string, userId: string) {
  const folder = await prisma.projectFolder.findUnique({ where: { id } });
  if (!folder) throw new NotFound('Folder not found');
  if (folder.userId !== userId) throw new Forbidden();
  return folder;
}

export async function renameFolder(
  id: string,
  userId: string,
  patch: { name?: string; color?: string | null },
) {
  await getFolderOrThrow(id, userId);
  return prisma.projectFolder.update({
    where: { id },
    data: {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.color !== undefined ? { color: patch.color } : {}),
    },
  });
}

export async function deleteFolder(id: string, userId: string) {
  await getFolderOrThrow(id, userId);
  // Move chats out of the folder first (schema uses SetNull, but do explicit for safety)
  await prisma.chat.updateMany({ where: { folderId: id }, data: { folderId: null } });
  await prisma.projectFolder.delete({ where: { id } });
}

export async function moveChatToFolder(chatId: string, userId: string, folderId: string | null) {
  await getChat(chatId, userId);
  if (folderId) {
    await getFolderOrThrow(folderId, userId);
  }
  return prisma.chat.update({
    where: { id: chatId },
    data: { folderId },
  });
}

export async function appendMessage(params: {
  chatId: string;
  userId: string;
  role: MessageRole;
  content: string;
  metadata?: object;
  tokensUsed?: number;
}) {
  const msg = await prisma.message.create({
    data: {
      chatId: params.chatId,
      userId: params.userId,
      role: params.role,
      content: params.content,
      metadata: params.metadata,
      tokensUsed: params.tokensUsed,
    },
  });
  await prisma.chat.update({ where: { id: params.chatId }, data: { updatedAt: new Date() } });
  return msg;
}
