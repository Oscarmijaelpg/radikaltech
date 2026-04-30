import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: { NODE_ENV: 'test', WEB_URL: 'http://localhost:3000', LOG_LEVEL: 'silent' },
}));

const projectFindUnique = vi.fn();
const objectiveFindUnique = vi.fn();
const objectiveFindMany = vi.fn();
const objectiveCreate = vi.fn();
const objectiveUpdate = vi.fn();
const objectiveDelete = vi.fn();

vi.mock('@radikal/db', () => ({
  prisma: {
    project: { findUnique: projectFindUnique },
    objective: {
      findUnique: objectiveFindUnique,
      findMany: objectiveFindMany,
      create: objectiveCreate,
      update: objectiveUpdate,
      delete: objectiveDelete,
    },
  },
}));

function makeProject(userId = 'u1') {
  return { id: 'p1', userId };
}

function makeObjective(overrides: Record<string, unknown> = {}) {
  return { id: 'o1', projectId: 'p1', userId: 'u1', ...overrides };
}

describe('objectivesService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('list', () => {
    it('returns objectives for project owner', async () => {
      projectFindUnique.mockResolvedValue(makeProject());
      objectiveFindMany.mockResolvedValue([makeObjective()]);
      const { objectivesService } = await import('../../src/modules/objectives/service.js');
      const items = await objectivesService.list('p1', 'u1');
      expect(items).toHaveLength(1);
    });

    it('throws for non-owner', async () => {
      projectFindUnique.mockResolvedValue(makeProject('other'));
      const { objectivesService } = await import('../../src/modules/objectives/service.js');
      await expect(objectivesService.list('p1', 'u1')).rejects.toThrow();
    });
  });

  describe('getById', () => {
    it('returns objective when owner matches', async () => {
      objectiveFindUnique.mockResolvedValue(makeObjective());
      projectFindUnique.mockResolvedValue(makeProject());
      const { objectivesService } = await import('../../src/modules/objectives/service.js');
      const o = await objectivesService.getById('o1', 'u1');
      expect(o.id).toBe('o1');
    });

    it('throws NotFound for missing objective', async () => {
      objectiveFindUnique.mockResolvedValue(null);
      const { objectivesService } = await import('../../src/modules/objectives/service.js');
      await expect(objectivesService.getById('missing', 'u1')).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('maps input fields to prisma data correctly', async () => {
      projectFindUnique.mockResolvedValue(makeProject());
      objectiveCreate.mockResolvedValue(makeObjective());
      const { objectivesService } = await import('../../src/modules/objectives/service.js');
      await objectivesService.create('u1', {
        project_id: 'p1',
        title: 'Grow followers',
        kpi: 'followers',
        target_value: 10000,
        status: 'active',
      });
      const call = objectiveCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
      expect(call.data.name).toBe('Grow followers');
      expect(call.data.unit).toBe('followers');
      expect(call.data.targetValue).toBe(10000);
      expect(call.data.status).toBe('active');
    });

    it('converts string due_date to Date', async () => {
      projectFindUnique.mockResolvedValue(makeProject());
      objectiveCreate.mockResolvedValue(makeObjective());
      const { objectivesService } = await import('../../src/modules/objectives/service.js');
      await objectivesService.create('u1', {
        project_id: 'p1',
        title: 'Goal',
        due_date: '2025-03-31',
      });
      const call = objectiveCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
      expect(call.data.deadline).toBeInstanceOf(Date);
    });
  });

  describe('update', () => {
    it('only maps provided fields', async () => {
      objectiveFindUnique.mockResolvedValue(makeObjective());
      projectFindUnique.mockResolvedValue(makeProject());
      objectiveUpdate.mockResolvedValue(makeObjective());
      const { objectivesService } = await import('../../src/modules/objectives/service.js');
      await objectivesService.update('o1', 'u1', { title: 'New title' });
      const call = objectiveUpdate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
      expect(call.data.name).toBe('New title');
      expect(call.data.unit).toBeUndefined();
    });
  });

  describe('remove', () => {
    it('deletes objective and returns { deleted: true }', async () => {
      objectiveFindUnique.mockResolvedValue(makeObjective());
      projectFindUnique.mockResolvedValue(makeProject());
      const { objectivesService } = await import('../../src/modules/objectives/service.js');
      const res = await objectivesService.remove('o1', 'u1');
      expect(objectiveDelete).toHaveBeenCalledWith({ where: { id: 'o1' } });
      expect(res.deleted).toBe(true);
    });
  });
});
