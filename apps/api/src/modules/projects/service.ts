import { prisma, type Project } from '@radikal/db';
import { Forbidden, NotFound } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';

export interface CreateProjectInput {
  name: string;
  description?: string;
  industry?: string;
  website?: string;
  instagram_url?: string;
  company_name?: string;
  industry_custom?: string;
  business_summary?: string;
  ideal_customer?: string;
  unique_value?: string;
  main_products?: string;
  additional_context?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  industry?: string;
  website?: string;
  company_name?: string;
  industry_custom?: string;
  business_summary?: string;
  ideal_customer?: string;
  unique_value?: string;
  main_products?: string;
  additional_context?: string;
}

function mapProjectInput(input: CreateProjectInput | UpdateProjectInput) {
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.businessSummary = input.description;
  if (input.industry !== undefined) data.industry = input.industry;
  if (input.website !== undefined) {
    data.websiteUrl = input.website;
    data.websiteSource = 'url';
  }
  if (input.company_name !== undefined) data.companyName = input.company_name;
  if (input.industry_custom !== undefined) data.industryCustom = input.industry_custom;
  if (input.business_summary !== undefined) data.businessSummary = input.business_summary;
  if (input.ideal_customer !== undefined) data.idealCustomer = input.ideal_customer;
  if (input.unique_value !== undefined) data.uniqueValue = input.unique_value;
  if (input.main_products !== undefined) data.mainProducts = input.main_products;
  if (input.additional_context !== undefined) data.additionalContext = input.additional_context;
  return data;
}

function dispatchProjectEnrichment(
  projectId: string,
  userId: string,
  input: CreateProjectInput,
) {
  const hasWebsite = !!input.website;
  const hasInstagram = !!input.instagram_url;
  if (!hasWebsite && !hasInstagram) return;

  // Dynamic import: evita cargar supabase/firecrawl/apify clients en contextos
  // (p.ej. tests) donde solo se ejercita el CRUD del proyecto.
  void (async () => {
    const { websiteAnalyzer, instagramScraper, parseInstagramHandle } = await import(
      '../ai-services/index.js'
    );

    if (hasWebsite) {
      const websiteUrl = input.website!;
      websiteAnalyzer
        .analyze({ url: websiteUrl, userId, projectId })
        .then(async ({ result }) => {
          const di = result.detected_info;
          const patch: Record<string, string> = {};
          const fresh = await prisma.project.findUnique({ where: { id: projectId } });
          if (!fresh) return;
          if (di.business_summary && !fresh.businessSummary) patch.businessSummary = di.business_summary;
          if (di.main_products && !fresh.mainProducts) patch.mainProducts = di.main_products;
          if (di.ideal_customer && !fresh.idealCustomer) patch.idealCustomer = di.ideal_customer;
          if (di.unique_value && !fresh.uniqueValue) patch.uniqueValue = di.unique_value;
          if (di.industry && !fresh.industry) patch.industry = di.industry;
          if (Object.keys(patch).length > 0) {
            await prisma.project.update({ where: { id: projectId }, data: patch });
            logger.info(
              { projectId, fields: Object.keys(patch) },
              'auto-applied detected_info to new project',
            );
          }
        })
        .catch((err) =>
          logger.warn({ err, url: websiteUrl }, 'project create website auto-analyze failed'),
        );
    }

    if (hasInstagram) {
      const handle = parseInstagramHandle(input.instagram_url!);
      if (handle) {
        instagramScraper
          .scrape({ handle, userId, projectId })
          .catch((err) =>
            logger.warn({ err, handle }, 'project create instagram auto-scrape failed'),
          );
      }
    }
  })().catch((err) =>
    logger.warn({ err }, 'project enrichment dispatch error'),
  );
}

function serializeProject(p: Project) {
  return {
    id: p.id,
    user_id: p.userId,
    name: p.name,
    company_name: p.companyName,
    industry: p.industry,
    industry_custom: p.industryCustom,
    website_source: p.websiteSource,
    website_url: p.websiteUrl,
    website_manual_description: p.websiteManualDescription,
    business_summary: p.businessSummary,
    ideal_customer: p.idealCustomer,
    unique_value: p.uniqueValue,
    main_products: p.mainProducts,
    additional_context: p.additionalContext,
    operating_countries: p.operatingCountries,
    operating_countries_suggested: p.operatingCountriesSuggested,
    is_default: p.isDefault,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}

async function assertOwner(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new NotFound('Project not found');
  if (project.userId !== userId) throw new Forbidden('Not project owner');
  return project;
}

export const projectsService = {
  async list(userId: string) {
    const items = await prisma.project.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return items.map(serializeProject);
  },

  async getById(id: string, userId: string) {
    const project = await assertOwner(id, userId);
    return serializeProject(project);
  },

  async create(userId: string, input: CreateProjectInput) {
    const count = await prisma.project.count({ where: { userId } });
    const created = await prisma.project.create({
      data: {
        userId,
        name: input.name,
        ...mapProjectInput(input),
        isDefault: count === 0,
      },
    });
    dispatchProjectEnrichment(created.id, userId, input);
    return serializeProject(created);
  },

  async update(id: string, userId: string, input: UpdateProjectInput) {
    await assertOwner(id, userId);
    const updated = await prisma.project.update({ where: { id }, data: mapProjectInput(input) });
    return serializeProject(updated);
  },

  async remove(id: string, userId: string) {
    await assertOwner(id, userId);
    await prisma.project.delete({ where: { id } });
    return { deleted: true };
  },

  async setDefault(id: string, userId: string) {
    await assertOwner(id, userId);
    const updated = await prisma.$transaction(async (tx) => {
      await tx.project.updateMany({ where: { userId }, data: { isDefault: false } });
      return tx.project.update({ where: { id }, data: { isDefault: true } });
    });
    return serializeProject(updated);
  },
};
