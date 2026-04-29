import { randomUUID } from 'node:crypto';
import { prisma, Prisma } from '@radikal/db';
import { env } from '../../config/env.js';
import { PROVIDER_URLS } from '../../config/providers.js';
import { logger } from '../../lib/logger.js';
import { supabaseAdmin } from '../../lib/supabase.js';
import { NotFound, Forbidden } from '../../lib/errors.js';
import { WebsiteAnalyzer } from './website-analyzer/index.js';
import { firecrawlScrape } from './website-analyzer/scrape.js';
import { mapWebsiteLinks } from './website-analyzer/firecrawl-service.js';
import { ContentEvaluator } from './content-evaluator.js';
import { BrandSynthesizer } from './brand-synthesizer.js';
import { ImageAnalyzer, type ImageVisualAnalysis } from './image-analyzer.js';
import { InstagramScraper, parseInstagramHandle } from './instagram-scraper.js';
import { TikTokScraper, parseTikTokHandle } from './tiktok-scraper.js';
import { MarketDetector } from './market-detector.js';
import { notificationService } from '../notifications/service.js';
import { JobLogger } from '../jobs/job-logger.js';
import { cleanWebContent } from './website-analyzer/content-cleaner.js';
import { initialIntelligenceOrchestrator } from './index.js';

const STORAGE_BUCKET = 'assets';

function extFromContentType(ct: string | null): string {
  if (!ct) return 'jpg';
  if (ct.includes('png')) return 'png';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('gif')) return 'gif';
  if (ct.includes('svg')) return 'svg';
  return 'jpg';
}

// Descarga una imagen externa y la sube a Supabase Storage. Devuelve la URL pública.
async function downloadAndStoreImage(
  externalUrl: string,
  userId: string,
): Promise<{ publicUrl: string; storagePath: string } | null> {
  try {
    const res = await fetch(externalUrl, {
      signal: AbortSignal.timeout(15_000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RadikalBot/1.0)' },
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type');
    if (ct && !ct.startsWith('image/') && !ct.includes('octet-stream')) return null;
    const arr = new Uint8Array(await res.arrayBuffer());
    if (arr.byteLength < 1000) return null; // ignorar pixels/sprites
    const ext = extFromContentType(ct);
    const storagePath = `${userId}/moodboard/${randomUUID()}.${ext}`;
    const up = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, arr, { contentType: ct ?? 'image/jpeg', upsert: false });
    if (up.error) return null;
    const pub = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
    return { publicUrl: pub.data.publicUrl, storagePath };
  } catch {
    return null;
  }
}

async function scrapePage(url: string, jl?: JobLogger): Promise<{ html: string; markdown: string } | null> {
  try {
    const res = await firecrawlScrape(url);
    if (res.success && res.data) {
      return { html: res.data.html ?? '', markdown: res.data.markdown ?? '' };
    }
    if (jl) await jl.warn(`Firecrawl devolvió sin data para ${url}`);
  } catch (err) {
    if (jl) await jl.warn(`Firecrawl falló en ${url}: ${err instanceof Error ? err.message : String(err)}`);
  }
  return null;
}

function absolutize(raw: string, base: string): string | null {
  try {
    return new URL(raw, base).toString();
  } catch {
    return null;
  }
}

function extractImagesFromHtml(html: string, baseUrl: string): string[] {
  if (!html) return [];
  const urls: string[] = [];
  // Excluir elementos técnicos, pero permitir logos si son grandes o variados
  const excludeKeywords = [
    'pixel', 'analytics', 'sprite', 'tracking', 'beacon', 'visa', 'mastercard', 
    'amex', 'paypal', 'pago', 'payment', 'checkout', 'cart', 'carrito', 
    'loading', 'spinner', 'button', 'arrow', 'avatar'
  ];
  
  const excludeExtensions = ['.svg', '.ico', '.gif', 'data:image'];

  const re = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const fullTag = m[0];
    const src = m[1];
    if (!src) continue;

    const lowSrc = src.toLowerCase();
    const lowTag = fullTag.toLowerCase();

    // Filtro de palabras prohibidas (solo lo puramente técnico)
    if (excludeKeywords.some(k => lowSrc.includes(k) || lowTag.includes(k))) continue;
    
    // Ignorar extensiones no fotográficas
    if (excludeExtensions.some(ext => lowSrc.includes(ext))) continue;

    const abs = absolutize(src, baseUrl);
    if (!abs) continue;
    
    if (!urls.includes(abs)) urls.push(abs);
  }
  return urls.slice(0, 100);
}

function safeParseJSON(text: string | null): any {
  if (!text) return {};
  try {
    let clean = text.trim();
    // Eliminar bloques de código markdown
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```[a-z]*\n/i, '').replace(/\n```$/m, '');
    }
    // Buscar el primer { y el último }
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      clean = clean.slice(start, end + 1);
    }
    return JSON.parse(clean);
  } catch (err) {
    logger.warn({ err, text: text?.slice(0, 200) }, 'failed to parse LLM JSON');
    return {};
  }
}

async function classifyUrls(urls: string[], brandSynthesizer: BrandSynthesizer): Promise<{ identity: string[]; products: string[]; others: string[] }> {
  if (urls.length <= 15) {
    return { identity: urls, products: [], others: [] };
  }

  const prompt = `
  Analiza esta lista de URLs y selecciona las mejores 15 para entender una marca.
  Divide el resultado en 3 categorías:
  1. identity: URLs sobre quiénes son (home, about, misión, historia). Máx 5.
  2. products: URLs sobre qué venden (productos, servicios, precios). Máx 7.
  3. others: URLs sobre contacto, clientes, blog o noticias. Máx 3.

  URLs:
  ${urls.join('\n')}

  RESPONDE SOLO EN JSON:
  {
    "identity": [],
    "products": [],
    "others": []
  }`;

  const completion = await brandSynthesizer.getLLMCompletion(prompt);
  const result = safeParseJSON(completion);

  return {
    identity: Array.isArray(result.identity) ? result.identity : [],
    products: Array.isArray(result.products) ? result.products : [],
    others: Array.isArray(result.others) ? result.others : [],
  };
}

function extractHexColors(html: string): string[] {
  const hexRegex = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g;
  const matches = html.match(hexRegex) || [];
  // Filtrar colores comunes como blanco/negro puro si hay muchos, 
  // pero mantenerlos si son parte de la identidad
  const unique = Array.from(new Set(matches.map(c => c.toUpperCase())));
  // Priorizar colores que aparecen en secciones clave (esto es una simplificación)
  return unique.slice(0, 10);
}

async function runIdentityAgent(urls: string[], projectId: string, userId: string, brandSynthesizer: BrandSynthesizer, jl: JobLogger) {
  if (urls.length === 0) return;
  await jl.info(`[Agente Identidad] Analizando ${urls.length} páginas...`);
  const results = await Promise.all(urls.map(u => scrapePage(u, jl)));
  const content = results.map(r => r ? `URL: ${r.url}\n${cleanWebContent(r.markdown)}` : '').join('\n\n');
  
  const prompt = `Extrae la IDENTIDAD de marca (Esencia, Misión, Visión, Tono de Voz, Audiencia). Mínimo 80 palabras por sección.
  Contenido:
  ${content}
  RESPONDE SOLO EN JSON:
  {
    "essence": "...",
    "mission": "...",
    "vision": "...",
    "voice_tone": "...",
    "target_audience": "..."
  }`;

  const completion = await brandSynthesizer.getLLMCompletion(prompt);
  const res = safeParseJSON(completion);
  
  await prisma.brandProfile.upsert({
    where: { projectId },
    update: {
      essence: res.essence || undefined,
      mission: res.mission || undefined,
      vision: res.vision || undefined,
      voiceTone: res.voice_tone || undefined,
      targetAudience: res.target_audience || undefined,
    },
    create: {
      projectId, userId,
      essence: res.essence || '',
      mission: res.mission || '',
      vision: res.vision || '',
      voiceTone: res.voice_tone || '',
      targetAudience: res.target_audience || '',
    }
  });
  await jl.success(`[Agente Identidad] Completado.`);
  return results;
}

async function runCommercialAgent(urls: string[], projectId: string, userId: string, brandSynthesizer: BrandSynthesizer, jl: JobLogger) {
  if (urls.length === 0) return;
  await jl.info(`[Agente Comercial] Analizando ${urls.length} páginas de productos...`);
  const results = await Promise.all(urls.map(u => scrapePage(u, jl)));
  const content = results.map(r => r ? `URL: ${r.url}\n${cleanWebContent(r.markdown)}` : '').join('\n\n');

  const prompt = `Analiza la oferta COMERCIAL (Productos/Servicios, Propuesta Única de Valor, Cliente Ideal). Mínimo 80 palabras para PUV y Cliente Ideal.
  Contenido:
  ${content}
  RESPONDE SOLO EN JSON:
  {
    "detailed_products": ["p1", "p2"],
    "unique_value": "...",
    "ideal_customer": "..."
  }`;

  const completion = await brandSynthesizer.getLLMCompletion(prompt);
  const res = safeParseJSON(completion);

  await prisma.project.update({
    where: { id: projectId },
    data: {
      mainProducts: Array.isArray(res.detailed_products) ? res.detailed_products.join('\n') : undefined,
      uniqueValue: res.unique_value || undefined,
      idealCustomer: res.ideal_customer || undefined,
    }
  });
  await jl.success(`[Agente Comercial] Completado.`);
  return results;
}

async function runContextAgent(urls: string[], projectId: string, userId: string, brandSynthesizer: BrandSynthesizer, jl: JobLogger) {
  if (urls.length === 0) return;
  await jl.info(`[Agente Contexto] Analizando mercado y ventaja competitiva...`);
  const results = await Promise.all(urls.map(u => scrapePage(u, jl)));
  const content = results.map(r => r ? `URL: ${r.url}\n${cleanWebContent(r.markdown)}` : '').join('\n\n');

  const prompt = `Analiza el CONTEXTO (Mercados/Países, Ventaja Competitiva, Resumen de Negocio). Mínimo 80 palabras por sección.
  Contenido:
  ${content}
  RESPONDE SOLO EN JSON:
  {
    "operating_countries": "...",
    "competitive_advantage": "...",
    "business_summary": "..."
  }`;

  const completion = await brandSynthesizer.getLLMCompletion(prompt);
  const res = safeParseJSON(completion);

  await prisma.brandProfile.upsert({
    where: { projectId },
    update: { competitiveAdvantage: res.competitive_advantage || undefined },
    create: { projectId, userId, competitiveAdvantage: res.competitive_advantage || '' }
  });

  await prisma.project.update({
    where: { id: projectId },
    data: {
      operatingCountries: res.operating_countries || undefined,
      businessSummary: res.business_summary || undefined
    }
  });
  await jl.success(`[Agente Contexto] Completado.`);
  return results;
}

async function runVisualAgent(homeUrl: string, projectId: string, userId: string, brandSynthesizer: BrandSynthesizer, jl: JobLogger) {
  await jl.info(`[Agente Visual] Detectando colores y estética...`);
  const res = await scrapePage(homeUrl, jl);
  if (!res) return;

  const htmlColors = extractHexColors(res.html);
  
  const prompt = `Analiza la ESTÉTICA VISUAL y dirección artística basándote en este contenido. Mínimo 80 palabras.
  Contenido:
  ${cleanWebContent(res.markdown)}
  RESPONDE SOLO EN JSON:
  {
    "visual_direction": "...",
    "suggested_colors": ["#hex1", "#hex2"]
  }`;

  const completion = await brandSynthesizer.getLLMCompletion(prompt);
  const result = safeParseJSON(completion);

  const finalColors = Array.from(new Set([
    ...(Array.isArray(result.suggested_colors) ? result.suggested_colors : []),
    ...htmlColors
  ])).slice(0, 8);

  await prisma.brandProfile.upsert({
    where: { projectId },
    update: { 
      visualDirection: result.visual_direction || undefined,
      colorPaletteSuggested: finalColors.length > 0 ? finalColors : undefined
    },
    create: { 
      projectId, userId, 
      visualDirection: result.visual_direction || '',
      colorPaletteSuggested: finalColors
    }
  });
  await jl.success(`[Agente Visual] Colores y dirección listos.`);
  return [res];
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  const workers: Promise<void>[] = [];
  const runOne = async () => {
    while (true) {
      const current = idx++;
      if (current >= items.length) return;
      try {
        results[current] = await fn(items[current]!);
      } catch (err) {
        logger.warn({ err }, 'mapLimit worker errored');
        results[current] = null as unknown as R;
      }
    }
  };
  for (let i = 0; i < Math.min(limit, items.length); i++) workers.push(runOne());
  await Promise.all(workers);
  return results;
}

function aggregatePalette(analyses: ImageVisualAnalysis[]): string[] {
  const counts = new Map<string, number>();
  for (const a of analyses) {
    for (const c of a.dominant_colors ?? []) {
      if (typeof c !== 'string') continue;
      const norm = c.trim().toUpperCase();
      if (!/^#([0-9A-F]{3}|[0-9A-F]{6})$/.test(norm)) continue;
      counts.set(norm, (counts.get(norm) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([c]) => c);
}

export class BrandOrchestrator {
  private imageAnalyzer = new ImageAnalyzer();
  private contentEvaluator = new ContentEvaluator();
  private brandSynthesizer = new BrandSynthesizer();
  private instagramScraper = new InstagramScraper();
  private tiktokScraper = new TikTokScraper();
  private websiteAnalyzer = new WebsiteAnalyzer();
  private marketDetector = new MarketDetector();

  async analyze(input: { projectId: string; userId: string }): Promise<void> {
    const project = await prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project) throw new NotFound('Project not found');
    if (project.userId !== input.userId) throw new Forbidden();

    const job = await prisma.aiJob.create({
      data: {
        kind: 'brand_analyze',
        status: 'running',
        input: { project_id: input.projectId },
        projectId: input.projectId,
        userId: input.userId,
        startedAt: new Date(),
      },
    });

    const jl = new JobLogger(job.id);
    await jl.info(`Iniciando orquestación de marca para el proyecto ${project.name}`);

    try {
      // 1. Discovery and Incremental Scrape
      let logoAsset: { id: string; url: string } | null = null;
      const allPagesData: Array<{ url: string; markdown: string }> = [];

      if (project.websiteUrl) {
        // First, home for logo and basic info
        try {
          const wa = await this.websiteAnalyzer.analyze({
            url: project.websiteUrl,
            userId: input.userId,
            projectId: input.projectId,
          });
          if (wa.result.logo_url && wa.result.logo_asset_id) {
            logoAsset = { id: wa.result.logo_asset_id, url: wa.result.logo_url };
          }
        } catch (err) {
          logger.warn({ err }, 'websiteAnalyzer failed, continuing');
        }

        // Descubrimiento con Firecrawl
        const base = project.websiteUrl;
        await jl.info(`[Firecrawl] Mapeando sitio completo...`);
        const discoveredUrls = await mapWebsiteLinks(base, jl);

        // Agente Clasificador
        await jl.info(`[Agente] Clasificando y priorizando ${discoveredUrls.length} URLs detectadas...`);
        const classified = await classifyUrls(discoveredUrls, this.brandSynthesizer);

        // 2. Ejecución Multi-Agente en Paralelo
        await jl.info(`Lanzando orquestación multi-agente en paralelo...`);
        
        const allPagesData: Array<{ url: string; markdown: string; html: string }> = [];
        const allExtractedImages: string[] = [];

        const collectImages = (results: any[]) => {
          if (!results) return;
          results.forEach(r => {
            if (r) {
              allPagesData.push({ url: r.url, markdown: r.markdown, html: r.html });
              allExtractedImages.push(...extractImagesFromHtml(r.html, r.url));
            }
          });
        };

        // Lanzar los 4 agentes simultáneamente
        const agentTasks = [
          runIdentityAgent(classified.identity, input.projectId, input.userId, this.brandSynthesizer, jl).then(collectImages),
          runCommercialAgent(classified.products, input.projectId, input.userId, this.brandSynthesizer, jl).then(collectImages),
          runContextAgent(classified.others, input.projectId, input.userId, this.brandSynthesizer, jl).then(collectImages),
          runVisualAgent(project.websiteUrl, input.projectId, input.userId, this.brandSynthesizer, jl).then(collectImages)
        ];

        // Esperamos a que todos terminen para tener la lista completa de imágenes para el moodboard
        await Promise.all(agentTasks);

        // 3. Persistencia de Imágenes (Moodboard) en Background
        const uniqueImages = Array.from(new Set(allExtractedImages));
        if (uniqueImages.length > 0) {
          await jl.info(`Analizando ${uniqueImages.length} candidatos para el Moodboard...`);
          let successCount = 0;
          for (const imgUrl of uniqueImages) {
            if (successCount >= 15) break;

            try {
              const stored = await downloadAndStoreImage(imgUrl, input.userId);
              if (stored) {
                const { marketing, art } = await ContentEvaluator.evaluateImageUrl(stored.publicUrl);

                await prisma.contentAsset.create({
                  data: {
                    projectId: input.projectId,
                    userId: input.userId,
                    assetType: 'image',
                    assetUrl: stored.publicUrl,
                    aestheticScore: marketing.aesthetic_score,
                    marketingFeedback: '',
                    aiDescription: art?.full_narrative || art?.description || null,
                    tags: Array.from(new Set(['moodboard', 'website_auto', ...marketing.tags])),
                    metadata: { 
                      source: 'brand_analysis', 
                      origin_url: imgUrl,
                      suggestions: marketing.suggestions,
                      detected_elements: marketing.detected_elements,
                      visual_analysis: art,
                    } as Prisma.InputJsonValue,
                  },
                });
                successCount++;
                await jl.info(`[${successCount}/15] Moodboard actualizado.`);
              }
            } catch (err) {
              continue;
            }
          }
          
          if (successCount < 15) {
            await jl.warn(`Solo se pudieron procesar ${successCount} imágenes de calidad para el Moodboard.`);
          } else {
            await jl.success(`✓ Moodboard completado con 15 imágenes analizadas.`);
          }
        }

        await jl.info(`Proceso incremental finalizado con ${allPagesData.length} páginas analizadas.`);
      }

      await jl.success('¡Análisis de marca completado con éxito!');
      
      await prisma.aiJob.update({
        where: { id: job.id },
        data: { 
          status: 'succeeded', 
          output: { success: true, pages_total: allPagesData.length } as Prisma.InputJsonValue,
          finishedAt: new Date(),
        },
      });

      // Lanza la búsqueda de noticias y competencia en background
      void initialIntelligenceOrchestrator.runInitialIntelligence({ projectId: input.projectId, userId: input.userId })
        .catch(err => logger.error({ err }, 'Failed to run initial intelligence after brand orchestrator'));

    } catch (err) {
      logger.error({ err }, 'brand orchestrator failed');
      await prisma.aiJob.update({
        where: { id: job.id },
        data: { status: 'failed', error: String(err), finishedAt: new Date() },
      });
      throw err;
    }
  }
}
