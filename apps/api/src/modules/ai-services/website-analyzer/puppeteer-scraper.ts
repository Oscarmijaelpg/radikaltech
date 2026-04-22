import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { env } from '../../../config/env.js';
import { logger } from '../../../lib/logger.js';

// @ts-ignore
puppeteer.use(StealthPlugin());

export interface PuppeteerScrapeResult {
  success: boolean;
  markdown?: string;
  html?: string;
  metadata?: {
    title?: string;
    description?: string;
  };
  error?: string;
}

export async function puppeteerScrape(url: string): Promise<PuppeteerScrapeResult> {
  logger.info({ url }, 'puppeteer scrape start');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--window-size=1920,1080',
      ],
    });

    const page = await browser.newPage();
    
    // Configurar un User-Agent realista
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    logger.info({ url }, 'puppeteer nav start');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: env.SCRAPE_TIMEOUT });
    
    // Esperar un poco más por si el JS está cargando contenido
    await new Promise(r => setTimeout(r, 3000));
    logger.info({ url }, 'puppeteer nav finished');

    const content = await page.evaluate(() => {
      // Función básica para obtener texto de forma legible (simplificada)
      const title = document.title;
      const description = (document.querySelector('meta[name="description"]') as HTMLMetaElement)?.content || 
                         (document.querySelector('meta[property="og:description"]') as HTMLMetaElement)?.content;
      
      return {
        title,
        description,
        html: document.documentElement.outerHTML,
        text: document.body.innerText
      };
    });

    logger.info({ url }, 'puppeteer scrape success');
    
    return {
      success: true,
      html: content.html,
      markdown: content.text, // Usamos el texto plano como markdown básico por ahora
      metadata: {
        title: content.title,
        description: content.description
      }
    };
  } catch (error) {
    logger.error({ url, error }, 'puppeteer scrape failed');
    return {
      success: false,
      error: String(error)
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
