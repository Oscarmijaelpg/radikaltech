import radikalLogo from '@/media/radikal-logo.png';
import siraProfile from '@/media/Sira.webp';
import type {
  BenchmarkResult,
  Competitor,
  CompetitorStats,
  SocialPostItem,
} from '../../api/memory';

const fmt = (v: number | null | undefined): string => {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  if (v >= 1000) return v.toLocaleString('es-ES', { maximumFractionDigits: 0 });
  return v.toLocaleString('es-ES', { maximumFractionDigits: 1 });
};

const escape = (s: string | null | undefined): string => {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

const paragraphs = (text: string | null | undefined): string => {
  if (!text) return '';
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escape(p)}</p>`)
    .join('');
};

const bullets = (text: string | null | undefined): string => {
  if (!text) return '';
  const items = text
    .split(/\n/)
    .map((l) => l.replace(/^[\s\-*•·\d\.\)]+/, '').trim())
    .filter(Boolean);
  if (items.length === 0) return '';
  return `<ol class="opp">${items
    .map((i, idx) => `<li><span class="num">${idx + 1}</span>${escape(i)}</li>`)
    .join('')}</ol>`;
};

interface Args {
  competitor: Competitor;
  stats: CompetitorStats | undefined;
  posts: SocialPostItem[] | undefined;
  benchmark: BenchmarkResult | null;
}

export function buildCompetitorReportHtml({ competitor, stats, posts, benchmark }: Args): string {
  const eng = stats?.engagement_stats ?? null;
  const narrative = competitor.narrative;
  const topPosts = [...(posts ?? [])]
    .sort(
      (a, b) => (b.likes ?? 0) + (b.comments ?? 0) * 3 - ((a.likes ?? 0) + (a.comments ?? 0) * 3),
    )
    .slice(0, 6);

  const social = competitor.social_links ?? {};
  const sync = competitor.sync_status ?? {};
  const platforms = Array.from(new Set([...Object.keys(social), ...Object.keys(sync)]));

  const me = benchmark?.my_brand;
  const them = benchmark?.competitors.find((c) => c.id === competitor.id);
  const hasBenchmark = !!(me && them);

  const analysis = competitor.analysis_data;
  const strengths =
    analysis?.competitors?.flatMap((c) => c.strengths ?? []).slice(0, 6) ?? [];
  const weaknesses =
    analysis?.competitors?.flatMap((c) => c.weaknesses ?? []).slice(0, 6) ?? [];
  const insights = analysis?.insights?.slice(0, 5) ?? [];

  const bestHour =
    eng?.best_hour !== null && eng?.best_hour !== undefined
      ? `${String(eng.best_hour).padStart(2, '0')}:00`
      : null;

  const today = new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return /* html */ `
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1e293b; margin: 0; padding: 0; line-height: 1.6; }
  .page { padding: 20mm; }
  .brand-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12mm; border-bottom: 3px solid #EC4899; margin-bottom: 10mm; }
  .brand-header .logo { display: flex; align-items: center; gap: 10px; }
  .brand-header .logo img { height: 34px; width: auto; }
  .brand-header .meta { text-align: right; font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
  h1 { font-size: 28px; font-weight: 900; color: #0f172a; margin: 0 0 6px 0; letter-spacing: -0.5px; }
  .subtitle { font-size: 13px; color: #64748b; margin: 0 0 4mm 0; }
  .section { page-break-inside: avoid; margin-bottom: 8mm; padding: 6mm; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff; }
  .section h2 { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin: 0 0 2mm 0; }
  .section h3 { font-size: 17px; font-weight: 800; color: #0f172a; margin: 0 0 5mm 0; }
  .section p { font-size: 13px; margin: 0 0 3mm 0; color: #334155; }
  .sira-intro { display: flex; gap: 4mm; align-items: flex-start; padding: 5mm; background: linear-gradient(135deg, #fdf2f8 0%, #fae8ff 100%); border: 1px solid #f5d0fe; border-radius: 10px; margin-bottom: 8mm; }
  .sira-intro img { width: 20mm; height: 20mm; border-radius: 10px; object-fit: cover; border: 2px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .sira-intro .text { flex: 1; }
  .sira-intro .tag { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #c026d3; margin-bottom: 2mm; }
  .sira-intro h2 { font-size: 18px; font-weight: 900; color: #0f172a; margin: 0 0 2mm 0; }
  .sira-intro p { font-size: 12px; color: #64748b; margin: 0; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; margin-top: 4mm; }
  .kpi { border: 1px solid #e2e8f0; border-radius: 8px; padding: 4mm; background: #f8fafc; }
  .kpi .label { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.2px; color: #94a3b8; margin-bottom: 2mm; }
  .kpi .value { font-size: 20px; font-weight: 900; color: #0f172a; }
  .kpi .sub { font-size: 10px; color: #64748b; margin-top: 1mm; }
  .vs-row { display: grid; grid-template-columns: 140px 1fr; gap: 3mm; padding: 3mm 0; border-bottom: 1px solid #f1f5f9; align-items: center; }
  .vs-row:last-child { border-bottom: none; }
  .vs-row .label { font-size: 11px; font-weight: 700; color: #64748b; }
  .vs-row .values { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; }
  .vs-cell { padding: 2.5mm 4mm; border-radius: 6px; background: #f8fafc; border: 1px solid #e2e8f0; }
  .vs-cell.win { background: #ecfdf5; border-color: #a7f3d0; }
  .vs-cell.lose { background: #fef2f2; border-color: #fecaca; }
  .vs-cell .who { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #64748b; }
  .vs-cell .n { font-size: 14px; font-weight: 800; color: #0f172a; }
  .verdict { display: inline-block; padding: 2mm 4mm; border-radius: 999px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3mm; }
  .verdict.ahead { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
  .verdict.parity { background: #e2e8f0; color: #334155; border: 1px solid #cbd5e1; }
  .verdict.behind { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
  .presence { display: grid; grid-template-columns: repeat(2, 1fr); gap: 3mm; margin-top: 3mm; }
  .presence .item { padding: 3mm; border: 1px solid #e2e8f0; border-radius: 6px; background: #f8fafc; }
  .presence .item .plat { font-size: 9px; font-weight: 900; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; }
  .presence .item .handle { font-size: 12px; font-weight: 700; color: #0f172a; margin-top: 1mm; }
  .presence .item .posts { font-size: 10px; color: #64748b; margin-top: 1mm; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; }
  .two-col h4 { font-size: 12px; font-weight: 800; margin: 0 0 2mm 0; text-transform: uppercase; letter-spacing: 1px; }
  .two-col .strengths h4 { color: #059669; }
  .two-col .weaknesses h4 { color: #dc2626; }
  .two-col ul { margin: 0; padding-left: 4mm; }
  .two-col li { font-size: 12px; margin-bottom: 1.5mm; color: #334155; }
  .insights { margin-top: 6mm; padding-top: 4mm; border-top: 1px solid #e2e8f0; }
  .insights h4 { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.2px; color: #d97706; margin: 0 0 2mm 0; }
  .insights ol { margin: 0; padding-left: 6mm; }
  .insights li { font-size: 12px; margin-bottom: 2mm; color: #334155; }
  .opp { margin: 0; padding: 0; list-style: none; }
  .opp li { display: flex; gap: 3mm; padding: 3mm 4mm; background: linear-gradient(135deg, #ede9fe 0%, #fae8ff 100%); border: 1px solid #ddd6fe; border-radius: 8px; margin-bottom: 3mm; font-size: 12px; color: #1e1b4b; }
  .opp .num { flex-shrink: 0; width: 7mm; height: 7mm; border-radius: 999px; background: linear-gradient(135deg, #8b5cf6, #ec4899); color: #fff; font-size: 11px; font-weight: 900; display: flex; align-items: center; justify-content: center; }
  .posts-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; margin-top: 3mm; }
  .post { border: 1px solid #e2e8f0; border-radius: 6px; padding: 3mm; background: #f8fafc; font-size: 10px; }
  .post .plat { font-size: 8px; font-weight: 900; text-transform: uppercase; color: #94a3b8; margin-bottom: 1mm; letter-spacing: 1px; }
  .post .caption { color: #1e293b; margin-bottom: 2mm; line-height: 1.4; max-height: 4em; overflow: hidden; }
  .post .stats { display: flex; gap: 3mm; color: #64748b; font-weight: 700; }
  .foot { margin-top: 10mm; padding-top: 5mm; border-top: 1px solid #e2e8f0; font-size: 9px; color: #94a3b8; text-align: center; letter-spacing: 1px; text-transform: uppercase; }
</style>

<div class="page">
  <div class="brand-header">
    <div class="logo">
      <img src="${radikalLogo}" alt="Radikal" />
    </div>
    <div class="meta">
      Reporte de competencia · ${today}
    </div>
  </div>

  <div class="sira-intro">
    <img src="${siraProfile}" alt="Sira" />
    <div class="text">
      <div class="tag">Investigación estratégica · Sira</div>
      <h2>${escape(competitor.name)}</h2>
      ${
        competitor.website
          ? `<p>${escape(competitor.website.replace(/^https?:\/\//, ''))}</p>`
          : ''
      }
    </div>
  </div>

  ${
    narrative?.summary?.trim()
      ? `<div class="section">
          <h2>Resumen ejecutivo</h2>
          <h3>Qué es esta marca, qué hace bien, dónde es vulnerable</h3>
          ${paragraphs(narrative.summary)}
        </div>`
      : ''
  }

  ${
    platforms.length > 0 || competitor.website
      ? `<div class="section">
          <h2>Presencia digital</h2>
          <h3>Sitio y redes detectadas</h3>
          <div class="presence">
            ${
              competitor.website
                ? `<div class="item">
                    <div class="plat">Sitio web</div>
                    <div class="handle">${escape(competitor.website.replace(/^https?:\/\//, ''))}</div>
                  </div>`
                : ''
            }
            ${platforms
              .map((p) => {
                const meta = (sync as Record<string, { post_count: number; handle?: string }>)[p];
                return `<div class="item">
                  <div class="plat">${escape(p)}</div>
                  <div class="handle">${meta?.handle ? '@' + escape(meta.handle) : 'Sin handle'}</div>
                  <div class="posts">${meta?.post_count ?? 0} posts sincronizados</div>
                </div>`;
              })
              .join('')}
          </div>
        </div>`
      : ''
  }

  ${
    eng && eng.total_posts > 0
      ? `<div class="section">
          <h2>Rendimiento social</h2>
          <h3>Actividad, engagement y mejor ventana de publicación</h3>
          <div class="kpis">
            <div class="kpi"><div class="label">Posts totales</div><div class="value">${fmt(eng.total_posts)}</div></div>
            <div class="kpi"><div class="label">Engagement prom.</div><div class="value">${fmt(eng.avg_engagement)}</div></div>
            <div class="kpi"><div class="label">Posts/semana</div><div class="value">${fmt(eng.posts_per_week)}</div></div>
            <div class="kpi"><div class="label">Mejor ventana</div><div class="value">${escape(eng.best_day ?? '—')}</div>${bestHour ? `<div class="sub">${bestHour}</div>` : ''}</div>
          </div>
        </div>`
      : ''
  }

  ${
    hasBenchmark
      ? (() => {
          const verdict = them!.my_vs_them.verdict;
          const verdictLabel =
            verdict === 'ahead'
              ? 'Vas por delante'
              : verdict === 'behind'
                ? 'Vas por detrás'
                : 'Están parejos';
          const row = (label: string, mine: number, theirs: number, higherBetter = true) => {
            const ahead = higherBetter ? mine > theirs : mine < theirs;
            const behind = higherBetter ? mine < theirs : mine > theirs;
            return `<div class="vs-row">
              <div class="label">${label}</div>
              <div class="values">
                <div class="vs-cell ${ahead ? 'win' : ''}"><div class="who">Tú</div><div class="n">${fmt(mine)}</div></div>
                <div class="vs-cell ${behind ? 'lose' : ''}"><div class="who">Competidor</div><div class="n">${fmt(theirs)}</div></div>
              </div>
            </div>`;
          };
          return `<div class="section">
            <h2>Tú vs este competidor</h2>
            <h3>Comparativa directa con tu marca</h3>
            <span class="verdict ${verdict}">${verdictLabel}</span>
            ${row('Posts totales', me!.social_posts_count, them!.social_posts_count)}
            ${row('Likes promedio', me!.avg_likes, them!.avg_likes)}
            ${row('Comments promedio', me!.avg_comments, them!.avg_comments)}
            ${row('Posts por semana', me!.posts_per_week, them!.posts_per_week)}
            ${row('Engagement score', me!.engagement_score, them!.engagement_score)}
          </div>`;
        })()
      : ''
  }

  ${
    topPosts.length > 0
      ? `<div class="section">
          <h2>Top posts</h2>
          <h3>Las publicaciones con más engagement</h3>
          <div class="posts-grid">
            ${topPosts
              .map(
                (p) => `<div class="post">
                <div class="plat">${escape(p.platform)}</div>
                <div class="caption">${escape(p.caption ?? '—')}</div>
                <div class="stats">
                  <span>♥ ${fmt(p.likes)}</span>
                  <span>💬 ${fmt(p.comments)}</span>
                </div>
              </div>`,
              )
              .join('')}
          </div>
        </div>`
      : ''
  }

  ${
    narrative?.aesthetic?.trim()
      ? `<div class="section">
          <h2>Estética visual</h2>
          <h3>Identidad visual inferida</h3>
          ${paragraphs(narrative.aesthetic)}
        </div>`
      : ''
  }

  ${
    strengths.length > 0 || weaknesses.length > 0 || insights.length > 0
      ? `<div class="section">
          <h2>Fortalezas, debilidades e insights</h2>
          <h3>Lo que encontramos en su presencia pública</h3>
          <div class="two-col">
            ${
              strengths.length > 0
                ? `<div class="strengths">
                  <h4>▲ Fortalezas</h4>
                  <ul>${strengths.map((s) => `<li>${escape(s)}</li>`).join('')}</ul>
                </div>`
                : '<div></div>'
            }
            ${
              weaknesses.length > 0
                ? `<div class="weaknesses">
                  <h4>▼ Debilidades</h4>
                  <ul>${weaknesses.map((w) => `<li>${escape(w)}</li>`).join('')}</ul>
                </div>`
                : '<div></div>'
            }
          </div>
          ${
            insights.length > 0
              ? `<div class="insights">
                <h4>★ Insights estratégicos</h4>
                <ol>${insights.map((i) => `<li>${escape(i)}</li>`).join('')}</ol>
              </div>`
              : ''
          }
        </div>`
      : ''
  }

  ${
    narrative?.opportunity?.trim()
      ? `<div class="section">
          <h2>Tu oportunidad</h2>
          <h3>Qué puedes hacer frente a este competidor</h3>
          ${bullets(narrative.opportunity)}
        </div>`
      : ''
  }

  <div class="foot">
    Generado con Radikal IA · ${today}
  </div>
</div>
  `.trim();
}
