import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: { NODE_ENV: 'test', WEB_URL: 'http://localhost:3000', LOG_LEVEL: 'silent' },
}));

const chatCount = vi.fn(async () => 0);
const chatFindMany = vi.fn(async () => []);
const chatGroupBy = vi.fn(async () => []);
const messageCount = vi.fn(async () => 0);
const messageFindMany = vi.fn(async () => []);
const assetCount = vi.fn(async () => 0);
const assetFindMany = vi.fn(async () => []);
const reportCount = vi.fn(async () => 0);
const reportFindMany = vi.fn(async () => []);
const competitorCount = vi.fn(async () => 0);
const competitorFindMany = vi.fn(async () => []);
const memoryCount = vi.fn(async () => 0);
const memoryFindMany = vi.fn(async () => []);

vi.mock('@radikal/db', () => ({
  prisma: {
    chat: { count: chatCount, findMany: chatFindMany, groupBy: chatGroupBy },
    message: { count: messageCount, findMany: messageFindMany },
    contentAsset: { count: assetCount, findMany: assetFindMany },
    report: { count: reportCount, findMany: reportFindMany },
    competitor: { count: competitorCount, findMany: competitorFindMany },
    memory: { count: memoryCount, findMany: memoryFindMany },
  },
}));

describe('stats service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getProjectStats returns counts and 30-day activity buckets', async () => {
    chatCount.mockResolvedValue(4);
    messageCount.mockResolvedValue(20);
    assetCount.mockResolvedValue(6);
    reportCount.mockResolvedValue(2);
    competitorCount.mockResolvedValue(3);
    memoryCount.mockResolvedValue(5);
    const now = new Date();
    messageFindMany.mockResolvedValue([{ createdAt: now }, { createdAt: now }]);
    assetFindMany.mockResolvedValue([{ createdAt: now }]);
    reportFindMany.mockResolvedValue([{ createdAt: now }]);
    chatGroupBy.mockResolvedValue([{ agentId: 'a1', _count: { _all: 3 } }]);
    chatFindMany.mockResolvedValue([
      { id: 'c1', title: 'Hi', updatedAt: now, agentId: 'a1' },
    ]);
    assetFindMany.mockResolvedValueOnce([{ createdAt: now }]); // first call: activity
    competitorFindMany.mockResolvedValue([{ id: 'cc1', name: 'X', createdAt: now }]);
    memoryFindMany.mockResolvedValue([
      { id: 'm1', category: 'brand', value: 'hello', createdAt: now },
    ]);

    const { getProjectStats } = await import('../../src/modules/stats/service.js');
    const s = await getProjectStats('u1', 'p1');
    expect(s.chats_count).toBe(4);
    expect(s.messages_count).toBe(20);
    expect(s.content_count).toBe(6);
    expect(s.activity_by_day.length).toBe(30);
    expect(s.top_agents).toEqual([{ agent_id: 'a1', chats_count: 3 }]);
    expect(s.recent_activity.length).toBeGreaterThan(0);
  });

  it('getUserStats omits projectId filter', async () => {
    const { getUserStats } = await import('../../src/modules/stats/service.js');
    await getUserStats('u1');
    // Each count call should have been invoked without projectId
    const firstChatCountCall = chatCount.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
    };
    expect(firstChatCountCall.where.projectId).toBeUndefined();
    expect(firstChatCountCall.where.userId).toBe('u1');
  });
});
