import { prisma } from '@radikal/db';

export interface ActivityDay {
  date: string; // YYYY-MM-DD
  messages: number;
  content: number;
  reports: number;
}

export interface TopAgent {
  agent_id: string;
  chats_count: number;
}

export interface RecentActivityItem {
  type: 'chat' | 'content' | 'report' | 'competitor' | 'memory';
  title: string;
  at: string;
  link: string;
}

export interface ProjectStats {
  chats_count: number;
  messages_count: number;
  content_count: number;
  reports_count: number;
  competitors_count: number;
  memories_count: number;
  chats_last_30d: number;
  messages_last_30d: number;
  content_last_30d: number;
  activity_by_day: ActivityDay[];
  top_agents: TopAgent[];
  recent_activity: RecentActivityItem[];
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function formatDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildEmptyActivity(days = 30): ActivityDay[] {
  const out: ActivityDay[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    out.push({ date: formatDay(d), messages: 0, content: 0, reports: 0 });
  }
  return out;
}

interface Scope {
  userId: string;
  projectId?: string;
}

function chatWhere(scope: Scope) {
  return {
    userId: scope.userId,
    ...(scope.projectId ? { projectId: scope.projectId } : {}),
  };
}

function projectScopedWhere(scope: Scope) {
  return {
    userId: scope.userId,
    ...(scope.projectId ? { projectId: scope.projectId } : {}),
  };
}

async function computeStats(scope: Scope): Promise<ProjectStats> {
  const since30 = daysAgo(29); // last 30 days inclusive of today

  const [
    chatsCount,
    messagesCount,
    contentCount,
    reportsCount,
    competitorsCount,
    memoriesCount,
    chatsLast30,
    messagesLast30,
    contentLast30,
  ] = await Promise.all([
    prisma.chat.count({ where: chatWhere(scope) }),
    prisma.message.count({
      where: {
        userId: scope.userId,
        ...(scope.projectId ? { chat: { projectId: scope.projectId } } : {}),
      },
    }),
    prisma.contentAsset.count({ where: projectScopedWhere(scope) }),
    prisma.report.count({ where: projectScopedWhere(scope) }),
    prisma.competitor.count({ where: projectScopedWhere(scope) }),
    prisma.memory.count({
      where: {
        userId: scope.userId,
        ...(scope.projectId ? { projectId: scope.projectId } : {}),
      },
    }),
    prisma.chat.count({ where: { ...chatWhere(scope), createdAt: { gte: since30 } } }),
    prisma.message.count({
      where: {
        userId: scope.userId,
        createdAt: { gte: since30 },
        ...(scope.projectId ? { chat: { projectId: scope.projectId } } : {}),
      },
    }),
    prisma.contentAsset.count({
      where: { ...projectScopedWhere(scope), createdAt: { gte: since30 } },
    }),
  ]);

  // Activity by day: last 30 days of messages/content/reports
  const [recentMessages, recentContent, recentReports] = await Promise.all([
    prisma.message.findMany({
      where: {
        userId: scope.userId,
        createdAt: { gte: since30 },
        ...(scope.projectId ? { chat: { projectId: scope.projectId } } : {}),
      },
      select: { createdAt: true },
    }),
    prisma.contentAsset.findMany({
      where: { ...projectScopedWhere(scope), createdAt: { gte: since30 } },
      select: { createdAt: true },
    }),
    prisma.report.findMany({
      where: { ...projectScopedWhere(scope), createdAt: { gte: since30 } },
      select: { createdAt: true },
    }),
  ]);

  const byDay = new Map<string, ActivityDay>();
  for (const d of buildEmptyActivity(30)) byDay.set(d.date, d);

  const bump = (
    items: { createdAt: Date }[],
    field: 'messages' | 'content' | 'reports',
  ) => {
    for (const it of items) {
      const key = formatDay(new Date(it.createdAt));
      const day = byDay.get(key);
      if (day) day[field] += 1;
    }
  };
  bump(recentMessages, 'messages');
  bump(recentContent, 'content');
  bump(recentReports, 'reports');
  const activityByDay = Array.from(byDay.values());

  // Top agents
  const grouped = await prisma.chat.groupBy({
    by: ['agentId'],
    where: chatWhere(scope),
    _count: { _all: true },
    orderBy: { _count: { agentId: 'desc' } },
    take: 5,
  });
  const topAgents: TopAgent[] = grouped
    .filter((g) => g.agentId)
    .map((g) => ({ agent_id: g.agentId as string, chats_count: g._count._all }));

  // Recent activity: last 10 events (chats, content, reports, competitors, memories)
  const [recChats, recContent2, recReports2, recCompetitors, recMemories] = await Promise.all([
    prisma.chat.findMany({
      where: chatWhere(scope),
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: { id: true, title: true, updatedAt: true, agentId: true },
    }),
    prisma.contentAsset.findMany({
      where: projectScopedWhere(scope),
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, assetUrl: true, aiDescription: true, createdAt: true },
    }),
    prisma.report.findMany({
      where: projectScopedWhere(scope),
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, title: true, createdAt: true },
    }),
    prisma.competitor.findMany({
      where: projectScopedWhere(scope),
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, name: true, createdAt: true },
    }),
    prisma.memory.findMany({
      where: {
        userId: scope.userId,
        ...(scope.projectId ? { projectId: scope.projectId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, category: true, value: true, createdAt: true },
    }),
  ]);

  const recent: RecentActivityItem[] = [
    ...recChats.map((c) => ({
      type: 'chat' as const,
      title: c.title ?? 'Conversación',
      at: c.updatedAt.toISOString(),
      link: `/chat/${c.id}`,
    })),
    ...recContent2.map((c) => ({
      type: 'content' as const,
      title: c.aiDescription?.slice(0, 60) ?? 'Asset',
      at: c.createdAt.toISOString(),
      link: `/content`,
    })),
    ...recReports2.map((r) => ({
      type: 'report' as const,
      title: r.title,
      at: r.createdAt.toISOString(),
      link: `/reports`,
    })),
    ...recCompetitors.map((c) => ({
      type: 'competitor' as const,
      title: c.name,
      at: c.createdAt.toISOString(),
      link: `/competitors`,
    })),
    ...recMemories.map((m) => ({
      type: 'memory' as const,
      title: `${m.category}: ${m.value.slice(0, 50)}`,
      at: m.createdAt.toISOString(),
      link: `/memory`,
    })),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 10);

  return {
    chats_count: chatsCount,
    messages_count: messagesCount,
    content_count: contentCount,
    reports_count: reportsCount,
    competitors_count: competitorsCount,
    memories_count: memoriesCount,
    chats_last_30d: chatsLast30,
    messages_last_30d: messagesLast30,
    content_last_30d: contentLast30,
    activity_by_day: activityByDay,
    top_agents: topAgents,
    recent_activity: recent,
  };
}

export async function getProjectStats(userId: string, projectId: string): Promise<ProjectStats> {
  return computeStats({ userId, projectId });
}

export async function getUserStats(userId: string): Promise<ProjectStats> {
  return computeStats({ userId });
}
