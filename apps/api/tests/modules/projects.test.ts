import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: { NODE_ENV: 'test', WEB_URL: 'http://localhost:3000', LOG_LEVEL: 'silent' },
}));

const projectFindUnique = vi.fn();
const projectFindMany = vi.fn();
const projectCount = vi.fn();
const projectCreate = vi.fn();
const projectUpdate = vi.fn();
const projectUpdateMany = vi.fn();
const projectDelete = vi.fn();
const txFn = vi.fn(async (cb: (tx: unknown) => unknown) =>
  cb({
    project: { updateMany: projectUpdateMany, update: projectUpdate },
  }),
);

vi.mock('@radikal/db', () => ({
  prisma: {
    project: {
      findUnique: projectFindUnique,
      findMany: projectFindMany,
      count: projectCount,
      create: projectCreate,
      update: projectUpdate,
      updateMany: projectUpdateMany,
      delete: projectDelete,
    },
    $transaction: txFn,
  },
}));

const baseProject = {
  id: 'p1',
  userId: 'u1',
  name: 'Acme',
  companyName: null,
  industry: null,
  industryCustom: null,
  websiteSource: null,
  websiteUrl: null,
  websiteManualDescription: null,
  businessSummary: null,
  idealCustomer: null,
  uniqueValue: null,
  mainProducts: null,
  additionalContext: null,
  operatingCountries: null,
  operatingCountriesSuggested: null,
  isDefault: true,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-02'),
};

describe('projectsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('list returns serialized projects', async () => {
    projectFindMany.mockResolvedValue([baseProject]);
    const { projectsService } = await import('../../src/modules/projects/service.js');
    const res = await projectsService.list('u1');
    expect(res[0]?.user_id).toBe('u1');
    expect(res[0]?.is_default).toBe(true);
    expect(res[0]?.created_at).toBe('2025-01-01T00:00:00.000Z');
  });

  it('getById enforces ownership', async () => {
    projectFindUnique.mockResolvedValue({ ...baseProject, userId: 'other' });
    const { projectsService } = await import('../../src/modules/projects/service.js');
    await expect(projectsService.getById('p1', 'u1')).rejects.toThrow();
  });

  it('create marks first project as default', async () => {
    projectCount.mockResolvedValue(0);
    projectCreate.mockResolvedValue(baseProject);
    const { projectsService } = await import('../../src/modules/projects/service.js');
    await projectsService.create('u1', {
      name: 'Acme',
      website: 'https://acme.com',
      business_summary: 'we do',
    });
    const data = (projectCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> }).data;
    expect(data.isDefault).toBe(true);
    expect(data.websiteUrl).toBe('https://acme.com');
    expect(data.businessSummary).toBe('we do');
  });

  it('update maps snake_case fields', async () => {
    projectFindUnique.mockResolvedValue(baseProject);
    projectUpdate.mockResolvedValue({ ...baseProject, name: 'New' });
    const { projectsService } = await import('../../src/modules/projects/service.js');
    await projectsService.update('p1', 'u1', {
      ideal_customer: 'founders',
      unique_value: 'fast',
    });
    const data = (projectUpdate.mock.calls[0]?.[0] as { data: Record<string, unknown> }).data;
    expect(data.idealCustomer).toBe('founders');
    expect(data.uniqueValue).toBe('fast');
  });

  it('setDefault unsets others in transaction', async () => {
    projectFindUnique.mockResolvedValue(baseProject);
    projectUpdate.mockResolvedValue(baseProject);
    const { projectsService } = await import('../../src/modules/projects/service.js');
    await projectsService.setDefault('p1', 'u1');
    expect(txFn).toHaveBeenCalled();
    expect(projectUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      data: { isDefault: false },
    });
  });

  it('remove enforces ownership and deletes', async () => {
    projectFindUnique.mockResolvedValue(baseProject);
    const { projectsService } = await import('../../src/modules/projects/service.js');
    const res = await projectsService.remove('p1', 'u1');
    expect(projectDelete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    expect(res.deleted).toBe(true);
  });
});
