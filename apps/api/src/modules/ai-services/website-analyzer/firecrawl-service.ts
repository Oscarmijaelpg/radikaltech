import FirecrawlApp from '@mendable/firecrawl-js';
import { env } from '../../../config/env.js';
import { logger } from '../../../lib/logger.js';
import { JobLogger } from '../../jobs/job-logger.js';

type FirecrawlLink = string | { url?: string };
type FirecrawlMapResponse = { links?: FirecrawlLink[] };
type FirecrawlCrawlResponse = { success?: boolean; data?: Array<{ url?: string }> };

let _firecrawl: FirecrawlApp | null = null;
const getFirecrawl = () => {
    if (!_firecrawl) {
        _firecrawl = new FirecrawlApp({ apiKey: env.FIRECRAWL_API_KEY });
    }
    return _firecrawl;
};

/**
 * Encuentra subpáginas relevantes de una URL base usando Firecrawl Map (SDK v4)
 * Intenta varias estrategias si la primera falla.
 * @param {string} url - La URL del sitio web a mapear
 * @param {JobLogger} [jl] - Logger opcional para la UI
 * @returns {Promise<string[]>} - Lista de subpáginas encontradas
 */
export const mapWebsiteLinks = async (url: string, jl?: JobLogger): Promise<string[]> => {
    // Limpieza de URL para Firecrawl
    const targetUrl = url.endsWith('/') ? url : `${url}/`;
    
    const strategies = [
        { name: 'API v2 Discovery (No Sitemap)', method: 'api_v2', options: { limit: 5000, includeSubdomains: false, sitemap: 'ignore' } },
        { name: 'API v2 Sitemap', method: 'api_v2', options: { limit: 5000, includeSubdomains: false, sitemap: 'include' } },
        { name: 'SDK Map Estándar', method: 'map', options: { limit: 5000, excludeExternalLinks: true } },
        { name: 'Crawl Deep', method: 'crawl', options: { limit: 50, maxDepth: 2 } }
    ];

    let bestLinks: string[] = [];

    for (const strategy of strategies) {
        try {
            if (jl) await jl.info(`[Firecrawl] Intentando mapeo (Estrategia: ${strategy.name})...`);
            
            let links: string[] = [];
            
            if (strategy.method === 'api_v2') {
                const response = await fetch('https://api.firecrawl.dev/v2/map', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${env.FIRECRAWL_API_KEY}`
                    },
                    body: JSON.stringify({
                        url: targetUrl,
                        ...strategy.options
                    })
                });

                if (response.ok) {
                    const res = (await response.json()) as FirecrawlMapResponse;
                    if (res.links && res.links.length > 0) {
                        links = res.links.map((l) => (typeof l === 'object' ? l.url ?? '' : l)).filter(Boolean);
                    }
                }
            } else if (strategy.method === 'map') {
                // @ts-expect-error — tipos del SDK @mendable/firecrawl-js no exponen .map() en v4 aún
                const res = (await getFirecrawl().map(targetUrl, strategy.options)) as FirecrawlMapResponse;
                if (res && res.links) {
                    links = res.links.map((l) => (typeof l === 'object' ? l.url ?? '' : l)).filter(Boolean);
                }
            } else {
                // @ts-expect-error — tipos del SDK @mendable/firecrawl-js no exponen .crawl() en v4 aún
                const res = (await getFirecrawl().crawl(targetUrl, strategy.options)) as FirecrawlCrawlResponse;
                if (res && (res.success || res.data)) {
                    links = (res.data ?? []).map((d) => d.url ?? '').filter(Boolean);
                }
            }
            
            // Filtrar sitemaps y archivos no deseados
            links = links.filter(l => l && !l.endsWith('.xml') && !l.endsWith('.pdf') && !l.endsWith('.jpg') && !l.endsWith('.png') && !l.endsWith('.jpeg'));

            if (links.length > bestLinks.length) {
                bestLinks = links;
            }

            // Si ya tenemos suficientes enlaces (ej. 30), podemos parar. 
            // Si tenemos menos de 15, intentamos la siguiente estrategia para mejorar.
            if (bestLinks.length >= 30) {
                if (jl) await jl.success(`[Firecrawl] ✅ Estrategia "${strategy.name}" exitosa con ${bestLinks.length} enlaces.`);
                break;
            }
            
            if (jl) await jl.warn(`[Firecrawl] Estrategia "${strategy.name}" devolvió solo ${links.length} enlaces. Intentando alternativa...`);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (jl) await jl.warn(`[Firecrawl] Error en estrategia "${strategy.name}": ${message}`);
            logger.warn({ url: targetUrl, strategy: strategy.name, err }, '[Firecrawl] Estrategia fallida');
        }
    }

    if (bestLinks.length > 0) {
        if (!bestLinks.includes(url)) bestLinks.unshift(url);
        return bestLinks;
    }

    if (jl) await jl.warn(`[Firecrawl] ⚠️ Todas las estrategias de mapeo fallaron. Usando solo URL base.`);
    return [url];
};
