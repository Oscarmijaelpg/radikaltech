
import { apifyService } from '../../../infrastructure/services/ApifyService';
import { tavilyService } from '../../../infrastructure/services/TavilyService';
import { callOpenRouter } from '../../../infrastructure/services/OpenRouterService';
import { SupabaseMemoryRepository } from '../../../infrastructure/repositories/SupabaseMemoryRepository';
import { generateEmbedding } from '../../../infrastructure/services/OpenAIService';

export interface CompetitorSocialAccount {
  network: 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'x' | 'linkedin';
  url: string;
}

export interface CompetitorInput {
  name: string;
  accounts: CompetitorSocialAccount[];
}

export class CompetitionAnalysisService {
  private memoryRepository = new SupabaseMemoryRepository();

  async analyzeCompetitors(
    userId: string,
    projectId: string | null | undefined,
    myBrand: CompetitorInput,
    competitors: CompetitorInput[],
    mode: 'combine' | 'social_only',
    companyContext: string
  ): Promise<void> {
    
    let socialData: string = "";
    let trendData: string = "";
    let generatedResearchPrompt: string = "";

    // 1. Social Extraction
    const allEntitiesToScrape = [myBrand, ...competitors];
    const socialResults = await this.scrapeAllSocial(allEntitiesToScrape);

    // Detect the BEST network for comparison (Dominant Network)
    // We want the network where both user and competitors have data.
    const networkScores: Record<string, { user: boolean, count: number }> = {};
    
    socialResults.forEach(r => {
      const isMyBrand = r.competitor.toLowerCase().trim() === myBrand.name.toLowerCase().trim();
      const hasContent = (Array.isArray(r.data) ? r.data : []).length > 0;
      
      if (!networkScores[r.network]) networkScores[r.network] = { user: false, count: 0 };
      if (isMyBrand && hasContent) networkScores[r.network].user = true;
      if (!isMyBrand && hasContent) networkScores[r.network].count++;
    });

    // Score = (Has User ? 10 : 0) + Count of competitors
    // This prioritizes networks where the user HAS data, then the ones with more competitors.
    let dominantNetwork = 'instagram';
    let maxScore = -1;

    Object.entries(networkScores).forEach(([net, score]) => {
      let currentScore = (score.user ? 100 : 0) + score.count;
      // Tie-breaker: prefer tiktok if scores equal
      if (net === 'tiktok' && score.user) currentScore += 0.5;

      if (currentScore > maxScore) {
        maxScore = currentScore;
        dominantNetwork = net;
      }
    });

    const myBrandHasData = networkScores[dominantNetwork]?.user || false;

    // Determine which networks the user ACTUALLY intended to analyze
    const targetNetworks = new Set<string>();
    if (competitors.length > 0) {
      competitors.forEach(c => c.accounts.forEach(a => targetNetworks.add(a.network)));
    } else {
      myBrand.accounts.forEach(a => targetNetworks.add(a.network));
    }

    // We filter which networks to keep based on whether AT LEAST ONE account has data, AND it's a target network
    const networksWithData = new Set(
      socialResults
        .filter(r => (Array.isArray(r.data) ? r.data : []).length > 0)
        .filter(r => targetNetworks.has(r.network))
        .map(r => r.network)
    );
    const networksPresent = Array.from(networksWithData);
    
    // We send ALL results for the present networks, even if some competitors have empty arrays.
    // This ensures competitors aren't silently dropped.
    const filteredResults = socialResults.filter(r => networksWithData.has(r.network));


    socialData = this.formatSocialDataForLLM(filteredResults, myBrand.name);

    // 2. Trend Analysis and Prompt Generation (if requested)
    if (mode === 'combine') {
      try {
        generatedResearchPrompt = await this.generateResearchPrompt(companyContext);
      } catch (e) {
        console.error('Failed capturing generated prompt', e);
      }
      trendData = await this.performTrendSearch(competitors, userId);
    }

    // 3. Prompt LLM to synthesize report
    const prompt = this.buildAnalysisPrompt(companyContext, myBrand, competitors, socialData, trendData, mode, generatedResearchPrompt, networksPresent);
    
    const llmOutput = await callOpenRouter('openai/gpt-4o', [
      { 
        role: 'system', 
        content: `Eres Nexo, el estratega de contenido de Radikal IA. Tu objetivo es generar un informe de análisis de competencia de alto impacto. 
        IMPORTANTE: 
        1. Al final de tu respuesta DEBES incluir un bloque JSON rodeado por <stats_json>...</stats_json>.
        2. PROHIBIDO USAR COMENTARIOS (// o /* */) DENTRO DEL BLOQUE JSON. EL JSON DEBE SER PURO.
        3. USA LAS URLS REALES que encuentres en los datos de scraping para el campo "postUrl".
        4. CREACIÓN DE GRÁFICOS (Matriz "charts"):
           - REDES DETECTADAS: [${networksPresent.join(', ')}]
           - DEBES GENERAR LOS GRÁFICOS REQUERIDOS PARA *CADA UNA* DE ESTAS REDES POR SEPARADO.
           - SI UNA RED ES "tiktok":
             - GENERA EXACTAMENTE Y ÚNICAMENTE 1 GRÁFICO (tipo 'scatter').
             - ESTÁ 100% PROHIBIDO GENERAR GRÁFICOS DE BARRAS, PROMEDIOS O DISTRIBUCIONES DE TIKTOK.
             - ID sugerido: chart_tiktok_scatter
             - Ejes: xAxis: "likes", yAxis: "comments"
           - SI UNA RED ES "instagram", "facebook" U OTRA: 
             - GENERA EXACTAMENTE 3 GRÁFICOS (Scatter, Barras Verticales, Barras Horizontales) para ESA red específica.
             - Ej sug: chart_ig_scatter, chart_ig_bars_v, chart_ig_bars_h.

            - REGLA DE ESQUEMA JSON (VITAL):
              - Marca siempre a "${myBrand.name}" con "isMyCompany": true en "data".
              - EN LOS GRÁFICOS SCATTER, DEBES INCLUIR OBLIGATORIAMENTE EL CAMPO "postUrl" CON LA URL REAL.

           - El JSON DEBE seguir esta estructura:
           {
             "charts": [
               {
                 "id": "unique_id_incluyendo_red",
                 "type": "bar" | "scatter",
                 "title": "...",
                 "subtitle": "...",
                 "interpretation": "...",
                 "data": [
                   // ¡IMPORTANTE! Para los gráficos Scatter, DEBES crear un elemento en este arreglo por CADA post/video suministrado. (ej. Si hay 10 posts de Marca A y 10 de Marca B, aquí debe haber 20 elementos).
                   {"companyName": "...", "isMyCompany": true/false, "postUrl": "URL_REAL_AQUI", "likes": 0, "comments": 0, "valor": 0}
                 ],
                 "config": {
                   "layout": "vertical" | "horizontal",
                   "xAxis": "...",
                   "yAxis": "...",
                   "fields": [ {"key": "...", "label": "...", "format": "number"} ]
                 }
               }
             ]
           }
        
        REGLA DE ORO DE TIKTOK: NUNCA generes más de 1 gráfico para la red tiktok. ¡NUNCA!
        REGLA DE ORO DE MARCA: Si "${myBrand.name}" tiene datos en una red, DEBE aparecer de PRIMERO en sus gráficos de barras y resaltado con isMyCompany: true.
        MENCIONA A LOS COMPETIDORES: Si un competidor no tiene datos, menciónalo en el análisis de texto ("interpretation"), pero NO lo grafiques.` 
      },
      { role: 'user', content: prompt }
    ]);

    // Parse stats if present
    const statsMatch = llmOutput.match(/<stats_json>([\s\S]*?)<\/stats_json>/);
    let stats = null;
    let cleanReport = llmOutput
      .replace(/<stats_json>[\s\S]*?<\/stats_json>/g, '')
      .replace(/```json[\s\S]*?```/g, '') // Remove any standard markdown JSON blocks
      .trim();

    // Secondary cleanup: If LLM output extra JSON/codes at the very end
    if (cleanReport.includes('{"charts":')) {
      cleanReport = cleanReport.split('{"charts":')[0].trim();
    }

    if (statsMatch) {
      try {
        // 1. Remove comments but EXCLUDE URLs (like https://)
        // This regex looks for // and removes it only if NOT preceded by a colon. 
        // This is safe for URLs like http:// or https://
        let sanitized = statsMatch[1].replace(/(^|[^\:])\/\/.*$/gm, '$1').trim();
        
        // 2. Clear control characters that break JSON.parse
        sanitized = sanitized.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, ' ');

        // 3. DEFENSIVE: Fix common LLM mistakes like mathematical expressions in JSON (e.g. "valor": (81/4.2))
        // This regex looks for patterns like: : (number / number) and replaces them with the result
        sanitized = sanitized.replace(/:\s*\(([\d\.\,]+)\s*[\/\*]\s*([\d\.\,]+)\)/g, (match, p1, p2) => {
          try {
            const n1 = parseFloat(p1.replace(/,/g, ''));
            const n2 = parseFloat(p2.replace(/,/g, ''));
            if (match.includes('/')) return `: ${n1 / n2}`;
            if (match.includes('*')) return `: ${n1 * n2}`;
          } catch(e) {}
          return match;
        });

        stats = JSON.parse(sanitized);
      } catch (e) {
        console.error('Error parsing stats JSON:', e);
        // Deep fallback for truncated or messy JSON
        try {
           const bracketMatch = statsMatch[1].match(/\{[\s\S]*\}/);
           if (bracketMatch) {
             let sanFallback = bracketMatch[0].replace(/(^|[^\:])\/\/.*$/gm, '$1').trim();
             sanFallback = sanFallback.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, ' ');
             
             // Also apply defensive fix in fallback
             sanFallback = sanFallback.replace(/:\s*\(([\d\.\,]+)\s*[\/\*]\s*([\d\.\,]+)\)/g, (match, p1, p2) => {
                const n1 = parseFloat(p1.replace(/,/g, ''));
                const n2 = parseFloat(p2.replace(/,/g, ''));
                return match.includes('/') ? `: ${n1 / n2}` : `: ${n1 * n2}`;
             });

             stats = JSON.parse(sanFallback);
           }
        } catch (fallbackError) {
          console.error('Critical failure parsing stats JSON even with fallback:', fallbackError);
        }
      }
    }

    // 4. Persistence Logic
    if (mode === 'combine') {
      // Replace: Delete old memories of this category to keep only the latest strategic report
      try {
        const categoriesToDelete = [
          'market_analysis', 'market_analisis', 'estadisticas', 
          'social_media_analysis', 'social_media_analisis', 
          'competencia', 'mercado', 'social media', 'competition',
          'social_media_data' // Also clear raw account data to avoid duplicate/stale info
        ];
        await Promise.all(categoriesToDelete.map(cat => this.memoryRepository.deleteMemoriesByCategory(userId, cat, projectId)));
      } catch (e) {
        console.error('Error clearing old memories:', e);
      }
    }

    const currentYear = new Date().getFullYear();
    // Report
    const reportEmbedding = await generateEmbedding(cleanReport).catch(() => undefined);
    await this.memoryRepository.saveMemory({
      user_id: userId,
      project_id: projectId || undefined,
      title: mode === 'combine' ? `Análisis Estratégico ${currentYear}: ${competitors[0]?.name || 'Mercado'}` : `Flash Social: ${competitors[0]?.name || 'Mercado'}`,
      content: cleanReport,
      memory_category: 'market_analysis',
      resource_type: 'markdown',
      embedding: reportEmbedding
    });

    // Stats
    if (stats) {
      const statsEmbedding = await generateEmbedding(JSON.stringify(stats)).catch(() => undefined);
      await this.memoryRepository.saveMemory({
        user_id: userId,
        project_id: projectId || undefined,
        title: 'Estadísticas de Competencia',
        content: JSON.stringify(stats),
        memory_category: 'estadisticas',
        resource_type: 'text',
        embedding: statsEmbedding
      });
    }

    // 5. Save detailed data for each analyzed social account (New: Ensuring bots have access to raw data)
    for (const res of filteredResults) {
      const postsText = this.formatSocialDataForLLM([res], myBrand.name);
      const resEmbedding = await generateEmbedding(`${res.competitor} ${res.network} ${postsText}`).catch(() => undefined);
      await this.memoryRepository.saveMemory({
        user_id: userId,
        project_id: projectId || undefined,
        title: `Actividad RRSS: ${res.competitor} (${res.network})`,
        content: postsText,
        memory_category: 'social_media_data',
        resource_type: 'text',
        embedding: resEmbedding
      });
    }
  }

  async refreshMarketAnalysis(
    userId: string,
    projectId: string | null | undefined,
    companyContext: string,
    companyName: string = 'Mi Marca',
    onProgress?: (msg: string) => void
  ): Promise<void> {
    if (onProgress) onProgress('Preparando investigación corporativa...');

    let brandingContext = '';
    try {
        const brandMemories = await this.memoryRepository.getMemoriesByCategory(userId, 'identidad_marca', projectId);
        const myBrandMemories = await this.memoryRepository.getMemoriesByCategory(userId, 'mi marca', projectId);
        brandingContext = [...brandMemories, ...myBrandMemories]
            .map(m => `[${m.title}]: ${m.content}`)
            .join('\n\n');
    } catch (e) {
        console.error('Error fetching brand identity for refresh:', e);
    }

    const fullContext = `${companyContext}\n\nINFORMACIÓN DE IDENTIDAD DE MARCA EN BASE DE DATOS:\n${brandingContext}`;

    if (onProgress) onProgress('Generando directrices de M&A y estrategia corporativa...');
    const generatedPrompt = await this.generateResearchPrompt(fullContext);

    if (onProgress) onProgress('Ejecutando mapeo e investigación con modelo especializado...');
    
    let reportResponse = '';
    try {
      const currentDate = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
      const currentYear = new Date().getFullYear();

      // Construcción del Prompt Final (Paso 2 + Paso 3)
      const finalKimiPrompt = `${generatedPrompt}

# INSTRUCCIONES DE FORMATO FINAL (RESPONDE EXACTAMENTE ASÍ)

TÍTULO DEL INFORME: REPORTE DE INTELIGENCIA COMPETITIVA Y ANÁLISIS ESTRATÉGICO M&A
1. Panorama Corporativo de la Competencia (Datos ACTUALIZADOS a ${currentYear}).
2. Mapeo de Competidores Reales en la misma Ciudad (Tabla con Web y Ubicación Oficial).
3. Análisis de Movimientos Estratégicos recientes (Últimos 12 meses).
4. FUENTES CONSULTADAS OBLIGATORIAS: Incluye links reales y cliqueables: [Nombre](URL).

IMPORTANTE PARA MÁQUINAS (BLOQUE DE GRÁFICAS): Al final, DEBES incluir este bloque con el nivel de amenaza detectado:
<stats_json>
{
  "charts": [
    {
      "id": "reporte",
      "type": "bar",
      "title": "Nivel de amenaza corporativa",
      "data": [
         {"companyName": "${companyName}", "valor": 80, "isMyCompany": true},
         {"companyName": "Competidor Encontrado", "valor": 60, "isMyCompany": false}
      ],
      "config": {
        "layout": "horizontal", 
        "xAxis": "companyName",
        "yAxis": "valor",
        "fields": [{"key": "valor", "label": "Nivel de Amenaza", "format": "number"}]
      }
    }
  ]
}
</stats_json>

REGLA DE ORO: NINGUNA MENCIÓN A REDES SOCIALES. SOLO OPERACIONES FÍSICAS RECIENTES.`;

      reportResponse = await callOpenRouter('moonshotai/kimi-k2.5', [{ role: 'user', content: finalKimiPrompt }]);
    } catch (e) {
      console.error('Error in search:', e);
    }

    // Parse stats if present
    const statsMatch = reportResponse.match(/<stats_json>([\s\S]*?)<\/stats_json>/);
    let stats = null;
    let reportContent = reportResponse
      .replace(/<stats_json>[\s\S]*?<\/stats_json>/g, '')
      .replace(/```json[\s\S]*?```/g, '')
      .trim();

    // Secondary cleanup: If LLM output extra JSON/codes at the very end
    if (reportContent.includes('{"charts":')) {
      reportContent = reportContent.split('{"charts":')[0].trim();
    }

    if (statsMatch) {
      try {
        let sanitized = statsMatch[1].replace(/(^|[^\:])\/\/.*$/gm, '$1').trim();
        sanitized = sanitized.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, ' ');
        stats = JSON.parse(sanitized);
      } catch (e) {
        try {
          const bracketMatch = statsMatch[1].match(/\{[\s\S]*\}/);
          if (bracketMatch) {
            let sanFallback = bracketMatch[0].replace(/(^|[^\:])\/\/.*$/gm, '$1').trim();
            sanFallback = sanFallback.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, ' ');
            stats = JSON.parse(sanFallback);
          }
        } catch {}
      }
    }

    // Limpia memorias viejas
    if (onProgress) onProgress('Actualizando registros de memoria...');
    try {
      const categoriesToDelete = [
        'market_analysis', 'market_analisis', 'estadisticas', 
        'social_media_analysis', 'social_media_analisis', 
        'competencia', 'mercado', 'social media', 'competition'
      ];
      await Promise.all(categoriesToDelete.map(cat => this.memoryRepository.deleteMemoriesByCategory(userId, cat, projectId)));
    } catch (e) {}

    const reportEmbedding = await generateEmbedding(reportContent).catch(() => undefined);
    await this.memoryRepository.saveMemory({
      user_id: userId,
      project_id: projectId || undefined,
      title: 'Análisis de Mercado y Competencia (Actualizado)',
      content: reportContent,
      memory_category: 'market_analysis',
      resource_type: 'markdown',
      embedding: reportEmbedding
    });

    if (stats) {
      const statsEmbedding = await generateEmbedding(JSON.stringify(stats)).catch(() => undefined);
      await this.memoryRepository.saveMemory({
        user_id: userId,
        project_id: projectId || undefined,
        title: 'Estadísticas de Competencia (Actualizado)',
        content: JSON.stringify(stats),
        memory_category: 'estadisticas',
        resource_type: 'text',
        embedding: statsEmbedding
      });
    }

    if (onProgress) onProgress('Análisis completado');
  }

  private async scrapeAllSocial(competitors: CompetitorInput[]): Promise<any[]> {
    const allResults: any[] = [];
    
    // Group URLs by network to call scrapers once per network (more efficient)
    const networkGroups: Record<string, { competitor: string, url: string }[]> = {
      instagram: [],
      tiktok: [],
      x: [],
      youtube: [],
      facebook: [],
      linkedin: []
    };

    competitors.forEach(comp => {
      comp.accounts.forEach(acc => {
        const net = acc.network.toLowerCase();
        const networkKey = net === 'twitter' ? 'x' : net;
        if (networkGroups[networkKey]) {
          networkGroups[networkKey].push({ competitor: comp.name, url: acc.url });
        }
      });
    });

    // Process each network
    for (const [network, accounts] of Object.entries(networkGroups)) {
      if (accounts.length === 0) continue;

      try {
        const urls = accounts.map(a => a.url);
        let results: any[] = [];

        switch (network) {
          case 'instagram': results = await apifyService.scrapeInstagram(urls); break;
          case 'tiktok': results = await apifyService.scrapeTikTok(urls); break;
          case 'x': results = await apifyService.scrapeTwitter(urls); break;
          case 'youtube': results = await apifyService.scrapeYoutube(urls); break;
          case 'facebook': results = await apifyService.scrapeFacebook(urls); break;
          case 'linkedin': results = await apifyService.scrapeLinkedIn(urls); break;
        }

        // Map results back to competitors
        accounts.forEach(acc => {
          // Filter results for this specific account
          const accountData = results.filter(item => {
            const itemUrl = (item.url || item.postUrl || item.videoUrl || item.webVideoUrl || '').toLowerCase();
            const accUrl = acc.url.toLowerCase();
            
            // Try matching by URL or by username in the item (ensuring strings aren't empty)
            if (itemUrl && accUrl && (itemUrl.includes(accUrl) || accUrl.includes(itemUrl))) return true;
            
            // TikTok specific match
            if (network === 'tiktok') {
              const username = (item.authorMeta?.name || item.author?.uniqueId || item.author || '').toLowerCase();
              if (username && (accUrl.includes(`@${username}`) || accUrl.includes(`/${username}`))) return true;
            }

            // Instagram specific match
            if (network === 'instagram') {
              const username = (item.ownerUsername || item.username || '').toLowerCase();
              if (username && (accUrl.includes(`/${username}/`) || accUrl.includes(`instagram.com/${username}`))) return true;
            }

            return false;
          });

          allResults.push({
            competitor: acc.competitor,
            network: network,
            url: acc.url,
            data: accountData
          });
        });

      } catch (e) {
        console.error(`[CompetitionAnalysis] Error scraping ${network}:`, e);
        // Add empty results for these accounts to not break the flow
        accounts.forEach(acc => {
          allResults.push({
            competitor: acc.competitor,
            network: network,
            url: acc.url,
            data: []
          });
        });
      }
    }

    return allResults;
  }

  private formatSocialDataForLLM(results: any[], myBrandName: string): string {
    return results.map(r => {
      const isMyBrand = r.competitor.toLowerCase().trim() === myBrandName.toLowerCase().trim();
      const entityLabel = isMyBrand ? `USUARIO (MI MARCA: ${myBrandName})` : `COMPETIDOR: ${r.competitor}`;
      
      const rawItems = Array.isArray(r.data) ? r.data : (r.data?.items || r.data?.results || []);
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setMonth(fourWeeksAgo.getMonth() - 1);
      
      let notice = "";
      let posts = rawItems
        .map((p: any) => {
          // Identify the most likely POST URL
          let postUrl = "";
          const possibleUrls = [
            p.postUrl, 
            p.instagram_url, 
            p.tiktok_url,
            p.webVideoUrl,
            p.web_video_url,
            p.permanent_url,
            p.link,
            p.url,
            p.permalink,
            p.shortcode ? `https://www.instagram.com/p/${p.shortcode}/` : null,
            p.shortCode ? `https://www.instagram.com/p/${p.shortCode}/` : null,
            p.id && r.network === 'instagram' ? `https://www.instagram.com/p/${p.id}/` : null
          ].filter(u => u && typeof u === 'string' && u.length > 5);

          postUrl = possibleUrls.find(u => u.includes('/p/') || u.includes('/reels/') || u.includes('/video/') || u.includes('/status/')) || possibleUrls[0] || "";

          // Determine content type
          let contentType = "Imagen";
          const typeStr = String(p.type || p.media_type || p.resourceType || "").toLowerCase();
          if (typeStr.includes('video') || typeStr.includes('reel') || typeStr.includes('clip') || p.videoUrl || p.media_type === 2) {
            contentType = "Video";
          } else if (typeStr.includes('carousel') || typeStr.includes('sidecar') || p.media_type === 8) {
            contentType = "Carousel";
          }

          // Robustly parse counts (handle strings with commas, objects, etc)
          const getNum = (val: any) => {
            if (typeof val === 'number') return val;
            if (typeof val === 'string') return parseInt(val.replace(/,/g, ''), 10) || 0;
            if (val && typeof val === 'object') return val.count || 0;
            return 0;
          };

          // Robust date parsing (support unix timestamps and ISO strings)
          let postDate = new Date();
          const rawDate = p.timestamp || p.createdAt || p.publishedAt || p.date || p.taken_at || p.created_time || p.createTime || p.createTimeISO || "";
          if (rawDate) {
             const d = typeof rawDate === 'number' && rawDate < 2000000000 ? new Date(rawDate * 1000) : new Date(rawDate);
             if (!isNaN(d.getTime())) postDate = d;
             else {
               // Fallback if Date(rawDate) failed but it's a string
               const ds = new Date(String(rawDate));
               if (!isNaN(ds.getTime())) postDate = ds;
             }
          }

          const stats = p.statistics || {};

          return {
            text: (p.caption || p.text || p.title || p.description || p.desc || p.videoDescription || "").substring(0, 150),
            likes: getNum(p.likesCount || p.likeCount || p.favoriteCount || p.reactionsCount || p.likes || p.likes_count || p.diggCount || p.digg_count || stats.diggCount || stats.digg_count),
            comments: getNum(p.commentsCount || p.commentCount || p.repliesCount || p.replies || p.comments || p.comments_count || p.commentCount || p.comment_count || stats.commentCount || stats.comment_count || 0),
            date: postDate,
            url: postUrl,
            type: contentType,
            followers: getNum(p.ownerFollowersCount || p.authorFollowersCount || p.followersCount || p.followerCount || p.edge_followed_by || p.authorStats?.followerCount || p.author?.followersCount || p.author?.followerCount || 0)
          };
        });
        
      // Ensure we sort by date appropriately if date exists, but keep origin order as fallback
      posts.sort((a: any, b: any) => b.date.getTime() - a.date.getTime());
      
      // We unconditionally take the slice of the newest 10 posts
      posts = posts.slice(0, 10);

      // Add notice if it's exceptionally small
      if (posts.length < 10 && rawItems.length > 0) {
        notice = "ESTA CUENTA TIENE MENOS DE 10 PUBLICACIONES EN TOTAL.";
      }
      
      // Safety/Fallback: If completely 0 scraped items
      if (posts.length === 0 && rawItems.length === 0) {
        notice = "NO SE DETECTARON POSTS RECIENTES DE ESTA CUENTA. Usa este punto de referencia con valor 0 para no ignorarla en la gráfica.";
        posts = [{
          text: "Sin datos",
          likes: 0,
          comments: 0,
          date: new Date(),
          url: r.url,
          type: "Video",
          followers: 0
        }];
      }

      const totalPosts = posts.length;
      const detectedFollowers = posts.find((p: any) => p.followers > 0)?.followers || 'No detectados';


      return `${entityLabel} (${r.network})
URL Perfil: ${r.url}
Seguidores Reales Detectados: ${detectedFollowers}
${notice ? `AVISO IMPORTANTE: ${notice}\n` : ''}
Posts específicos encontrados (Úsalos para las gráficas y el reporte):
${posts.slice(0, 10).map((p: any, i: number) => `${i+1}. [${p.type}] ${p.likes} likes, ${p.comments} comments. Seguidores del autor: ${p.followers}. URL: ${p.url}`).join('\n')}
`;

    }).join('\n---\n');
  }

  private async performTrendSearch(competitors: CompetitorInput[], userId: string): Promise<string> {
    const currentYear = new Date().getFullYear();
    const queries = competitors.map(c => 
      `tendencias estratégicas ${currentYear} sector ${c.name}, nuevos productos ${c.name}, expansion ${c.name}`
    );
    
    let combinedResults: any[] = [];
    
    for (const query of queries) {
      try {
        const result = await tavilyService.search(query, 'advanced');
        if (result && result.results) {
          combinedResults.push(...result.results);
        }
      } catch (e) {
        console.error(`Trend search error for ${query}:`, e);
      }
    }

    return combinedResults.map(res => `
Título: ${res.title}
Fuente: ${res.url}
Contenido: ${res.content}
Fecha Búsqueda: ${new Date().toLocaleDateString()}
`).join('\n---\n');
  }

  private async generateResearchPrompt(companyContext: string): Promise<string> {
    const metaPrompt = `Actúa como Director de Inteligencia de Negocios y Operaciones Corporativas. 

Tu objetivo es leer los datos de la empresa y generar un prompt ultra-estricto para el modelo KIMI.

[Variables recibidas: Contexto de tu empresa e Identidad de marca]
${companyContext}

Paso 1 — Extracción Profunda del "Nicho Restrictivo" y Geografía Regional:
1. Define el Nombre de la empresa real.
2. Identifica la REGIÓN/DEPARTAMENTO/ESTADO y el PAÍS real donde opera la empresa basándote en la información.
3. Define un Nicho Flexible: Permite competidores sustitutos que resuelvan la misma necesidad en la región (ej. si eres un eco-hotel, busca resorts o haciendas de eventos cercanas).
4. Define un Criterio de Exclusión: Permite amplitud de temática PERO descarta fuertemente a cualquiera que opere fuera del Estado/Región identificada.

Paso 2 — Construye EL SIGUIENTE PROMPT y devuélvelo como tu única respuesta:
(Aquí la IA redactará el prompt para el Paso 2).`;

    try {
      const generatedPrompt = await callOpenRouter('openai/gpt-4o', [
        { role: 'user', content: metaPrompt }
      ]);
      return generatedPrompt;
    } catch (e) {
      console.error('Error in generateResearchPrompt', e);
      return 'Busca competidores corporativos reales y directos, ignora todo sobre redes sociales y entrégame movimientos estratégicos empresariales.';
    }
  }

  private buildAnalysisPrompt(
    companyContext: string, 
    myBrand: CompetitorInput,
    competitors: CompetitorInput[], 
    socialData: string, 
    trendData: string,
    mode: 'combine' | 'social_only',
    generatedPrompt: string,
    networksPresent: string[]
  ): string {
    return `
# OBJETIVO
Generar un análisis de competencia profundo para una empresa con el siguiente contexto:
${companyContext}

${mode === 'combine' && generatedPrompt ? `
# [PROMPT DE INVESTIGACIÓN AVANZADO GENERADO]
${generatedPrompt}
ESTE PROMPT DEBE SER TU GUÍA PRINCIPAL PARA EL ANÁLISIS ESTRATÉGICO. APLICA TODAS SUS FASES Y ETAPAS RIGUROSAMENTE.
` : ''}

# MI MARCA (CUENTA PRINCIPAL DEL USUARIO)
${myBrand.name}

# COMPETIDORES CONOCIDOS (Agregados por el usuario)
${competitors.map(c => c.name).join(', ')}

# DATOS EXTRAÍDOS DE REDES SOCIALES (Últimas 4 semanas)
${socialData}

${mode === 'combine' ? `# DATOS TAVILY (TENDENCIAS Y NOTICIAS EN TIEMPO REAL ${new Date().getFullYear()})
${trendData}` : ''}

# REQUISITOS DEL INFORME (ESPAÑOL)
1. ESTRUCTURA:
   - Resumen Ejecutivo.
   - Análisis Detallado de Engagement en Redes (incluye tablas con Likes/Comentarios promedio).
   - Resumen de actividad de cada competidor y posible estrategia detectada.
   ${mode === 'combine' ? '- SI tienes el Prompt Generado arriba, asegúrate de responder a TODAS SUS FASES (Evaluación Cuantitativa, Diagnóstico, etc).' : ''}
   - Recomendaciones estratégicas para Mi Marca.

2. ESTILO: Premium, profesional, consultoría.
3. FUENTES: Incluye SIEMPRE las fuentes al final (links de redes y links de tendencias).
4. CRÍTICO: Si el usuario seleccionó "Solo mirar redes", enfócate en los datos de engagement y la descripción de los gráficos. Si seleccionó "combinar con tendencias", integra la información en el análisis global aplicando el Prompt.
5. REGLA DE ORO: NUNCA menciones herramientas internas (Tavily, Apify, etc.) ni generes bloques JSON de herramientas. Eres Nexo de Radikal IA.

REGLA DE GRÁFICOS:
Incluye una sección de datos suministrados por los competidores representados en un gráfico (usando tablas o formato JSON que pueda ser renderizado).

MÁXIMA PRIORIDAD: Fuentes y fechas reales.
`;
  }
}

export const competitionAnalysisService = new CompetitionAnalysisService();
