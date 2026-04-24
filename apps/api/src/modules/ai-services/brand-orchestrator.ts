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
import { BrandSynthesizer } from './brand-synthesizer.js';
import { ImageAnalyzer, type ImageVisualAnalysis } from './image-analyzer.js';
import { InstagramScraper, parseInstagramHandle } from './instagram-scraper.js';
import { TikTokScraper, parseTikTokHandle } from './tiktok-scraper.js';
import { MarketDetector } from './market-detector.js';
import { notificationService } from '../notifications/service.js';
import { JobLogger } from '../jobs/job-logger.js';
import { cleanWebContent } from './website-analyzer/content-cleaner.js';

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
  // Excluir palabras clave de pago, iconos pequeños y elementos técnicos
  const excludeKeywords = [
    'pixel', 'analytics', 'sprite', 'tracking', 'beacon', 'visa', 'mastercard', 
    'amex', 'paypal', 'pago', 'payment', 'checkout', 'cart', 'carrito', 
    'loading', 'spinner', 'icon', 'logo', 'button', 'arrow'
  ];
  
  const re = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const fullTag = m[0];
    const src = m[1];
    if (!src) continue;

    const lowSrc = src.toLowerCase();
    const lowTag = fullTag.toLowerCase();

    // Filtro de palabras prohibidas
    if (excludeKeywords.some(k => lowSrc.includes(k) || lowTag.includes(k))) continue;
    
    // Ignorar extensiones no fotográficas
    if (lowSrc.endsWith('.svg') || lowSrc.includes('data:image')) continue;

    const abs = absolutize(src, baseUrl);
    if (!abs) continue;
    
    // Priorización básica: imágenes que parecen banners o productos suelen tener 'banner', 'product', 'gallery' o tamaños grandes
    // Por ahora, solo evitamos lo irrelevante y nos quedamos con lo que parece contenido real
    if (!urls.includes(abs)) urls.push(abs);
  }
  return urls.slice(0, 30);
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

        // Discovery con Firecrawl (n8n style: limit 5000, sitemap ignore)
        const base = project.websiteUrl;
        await jl.info(`[Firecrawl] Mapeando sitio completo (estilo n8n)...`);
        const discoveredUrls = await mapWebsiteLinks(base, jl);

        // Usar los enlaces en el orden natural de Firecrawl (tomando hasta 30)
        const finalUrls = Array.from(new Set(discoveredUrls)).slice(0, 30);

        await jl.info(`Iniciando escaneo incremental de ${finalUrls.length} páginas en el orden detectado...`);

        const BATCH_SIZE = 5;
        const ORCHESTRATOR_TIMEOUT_MS = 5 * 60_000;
        const startedAt = Date.now();
        let homeContent = '';
        let otherContent = '';
        const allExtractedImages: string[] = [];

        for (let i = 0; i < finalUrls.length; i += BATCH_SIZE) {
          if (Date.now() - startedAt > ORCHESTRATOR_TIMEOUT_MS) {
            await jl.warn(
              `⏱ Timeout de 5 min alcanzado. Deteniendo con ${allPagesData.length} páginas procesadas para no dejar al usuario esperando.`,
            );
            break;
          }
          const batchNum = Math.floor(i / BATCH_SIZE) + 1;
          const batchUrls = finalUrls.slice(i, i + BATCH_SIZE);
          
          await jl.info(`[Bloque ${batchNum}] Scrapeando ${batchUrls.length} páginas...`);
          
          const batchResults = await Promise.all(
            batchUrls.map(async (u) => {
              const res = await scrapePage(u, jl);
              if (res) {
                const imgs = extractImagesFromHtml(res.html, u);
                allExtractedImages.push(...imgs);

                const cleanMd = cleanWebContent(res.markdown);
                allPagesData.push({ url: u, markdown: cleanMd });
                
                const formatted = `URL: ${u}\nCONTENIDO:\n${cleanMd}\n---\n`;
                // Guardar el Home aparte para que nunca se pierda
                if (u === base || u === base + '/') {
                  homeContent = formatted;
                }
                return formatted;
              }
              return '';
            })
          );

          otherContent += batchResults.join('\n');

          // Sintetizar y actualizar DB tras cada lote de 5
          await jl.info(`[Bloque ${batchNum}] Actualizando identidad y mercados...`);
          const prompt = `
          Eres un experto en estrategia de marca. Tu misión es extraer la identidad COMPLETO de la empresa basándote en su web.
          
          REGLAS CRÍTICAS:
          1. PRODUCTOS/SERVICIOS: Genera un LISTADO de los productos/servicios. Solo el nombre o una descripción corta por línea.
          2. RESUMEN NEGOCIO: Genera un análisis estratégico de qué hace la empresa.
          3. MERCADOS: Analiza en qué países, CIUDADES y ZONAS opera la marca. Identifica cuál es el país principal (prioriza el país del dominio .co, .es, etc.). Genera un ANÁLISIS DETALLADO en un párrafo narrativo (sin viñetas).
          4. IDENTIDAD: Define misión, visión y valores.

          CONTENIDO PRINCIPAL (HOME):
          ${homeContent}

          CONTENIDO ADICIONAL (SUBPÁGINAS):
          ${otherContent.slice(-20000)}

          RESPONDE SOLO EN JSON:
          {
            "essence": "resumen marca",
            "mission": "misión corporativa",
            "vision": "visión a futuro",
            "brand_values": ["valor1", "valor2"],
            "voice_tone": "tono y personalidad",
            "target_audience": "público objetivo",
            "competitive_advantage": "qué los hace únicos",
            "operating_countries": "ANÁLISIS DETALLADO DE MERCADOS Y UBICACIONES (Países, ciudades, zonas)",
            "detailed_products": ["Producto 1", "Servicio A"],
            "business_summary": "ANÁLISIS ESTRATÉGICO DEL NEGOCIO",
            "visual_direction": "estética visual detectada"
          }`;

          const completion = await this.brandSynthesizer.getLLMCompletion(prompt);
          const result = JSON.parse(completion || '{}');

          // Limpieza de seguridad para evitar [object Object]
          const formatStringList = (val: unknown): string => {
            if (Array.isArray(val)) {
              return val
                .map((v) => {
                  if (v && typeof v === 'object') {
                    const o = v as { name?: unknown; title?: unknown };
                    return String(o.name ?? o.title ?? JSON.stringify(v));
                  }
                  return String(v);
                })
                .join('\n');
            }
            return String(val ?? '');
          };

          const rawMarkets = result.operating_countries;
          let marketText: string | null = null;
          if (typeof rawMarkets === 'string') {
            const trimmed = rawMarkets.trim();
            marketText = trimmed.length > 0 ? trimmed : null;
          } else if (Array.isArray(rawMarkets)) {
            const list = (rawMarkets as unknown[]).map((v) => {
              if (v && typeof v === 'object') {
                const o = v as { name?: unknown };
                return String(o.name ?? JSON.stringify(v));
              }
              return String(v);
            });
            marketText = list.length > 0 ? list.join(', ') : null;
          }

          // Persistencia incremental de texto
          await prisma.brandProfile.upsert({
            where: { projectId: input.projectId },
            update: {
              essence: result.essence,
              mission: result.mission,
              vision: result.vision,
              brandValues: result.brand_values,
              voiceTone: result.voice_tone,
              targetAudience: result.target_audience,
              competitiveAdvantage: result.competitive_advantage,
              visualDirection: result.visual_direction,
              aiGenerated: true
            },
            create: {
              projectId: input.projectId,
              userId: input.userId,
              essence: result.essence,
              mission: result.mission,
              vision: result.vision,
              brandValues: result.brand_values,
              voiceTone: result.voice_tone,
              targetAudience: result.target_audience,
              competitiveAdvantage: result.competitive_advantage,
              visualDirection: result.visual_direction,
              aiGenerated: true
            }
          });

          await prisma.project.update({
            where: { id: input.projectId },
            data: { 
              businessSummary: result.business_summary,
              mainProducts: formatStringList(result.detailed_products),
              operatingCountries: marketText,
              operatingCountriesSuggested: null,
            },
          });
          
          await jl.success(`[Bloque ${batchNum}] Identidad actualizada.`);

          // PARADA INTELIGENTE: Si todos los campos críticos están llenos, podemos detenernos
          const isComplete = 
            result.essence && 
            result.mission && 
            result.vision && 
            result.brand_values?.length > 0 && 
            result.voice_tone && 
            result.target_audience && 
            result.competitive_advantage && 
            (typeof marketText === 'string' && marketText.length > 0) &&
            result.business_summary;

          if (isComplete) {
            await jl.success(`✨ Identidad de marca completada al 100%. Deteniendo análisis temprano para ahorrar tiempo.`);
            break;
          }
        }

        // 2. Persistencia de Imágenes (Moodboard)
        const uniqueImages = Array.from(new Set(allExtractedImages)).slice(0, 15);
        if (uniqueImages.length > 0) {
          await jl.info(`Procesando ${uniqueImages.length} imágenes detectadas para el Moodboard...`);
          for (const imgUrl of uniqueImages) {
            try {
              const stored = await downloadAndStoreImage(imgUrl, input.userId);
              if (stored) {
                await prisma.contentAsset.create({
                  data: {
                    projectId: input.projectId,
                    userId: input.userId,
                    assetType: 'image',
                    assetUrl: stored.publicUrl,
                    tags: ['moodboard', 'website_auto'],
                    metadata: { source: 'brand_analysis', origin_url: imgUrl } as Prisma.InputJsonValue,
                  },
                });
              }
            } catch (err) {
              logger.warn({ err, imgUrl }, 'moodboard image persist failed');
            }
          }
          await jl.success(`✓ Moodboard actualizado con imágenes del sitio.`);
        }

        await jl.info(`Proceso incremental finalizado con ${allPagesData.length} páginas analizadas.`);
      }

      await jl.success('¡Análisis de marca completado con éxito!');
      
      await prisma.aiJob.update({
        where: { id: job.id },
        data: { 
          status: 'succeeded', 
          output: { success: true, pages_total: allPagesData.length, images_found: allPagesData.length } as Prisma.InputJsonValue,
          finishedAt: new Date(),
        },
      });
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
