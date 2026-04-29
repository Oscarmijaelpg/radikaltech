import { prisma } from '@radikal/db';

export interface EngagementStats {
  total_posts: number;
  total_likes: number;
  total_comments: number;
  total_views: number;
  total_shares: number;
  avg_likes: number;
  avg_comments: number;
  avg_views: number;
  avg_engagement: number;
  posts_per_week: number;
  top_post_ids: string[];
  best_hour: number | null;
  best_day: string | null;
  by_platform: Record<
    string,
    { count: number; likes: number; comments: number; views: number; shares: number }
  >;
  updated_at: string;
}

export interface SocialStats {
  total_posts: number;
  total_likes: number;
  total_comments: number;
  total_views: number;
  avg_engagement: number;
  by_platform: Record<string, { count: number; likes: number; comments: number; views: number }>;
  top_post: {
    post_url: string;
    caption: string | null;
    likes: number;
    comments: number;
    platform: string;
  } | null;
}

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const WEEK_MS = 7 * 86_400_000;
const TOP_POSTS_LIMIT = 5;
const ENGAGEMENT_COMMENT_WEIGHT = 3;
const ENGAGEMENT_SHARE_WEIGHT = 5;

function engagementOf(p: { likes: number; comments: number; shares: number }): number {
  return p.likes + p.comments * ENGAGEMENT_COMMENT_WEIGHT + p.shares * ENGAGEMENT_SHARE_WEIGHT;
}

export async function computeEngagementStats(competitorId: string): Promise<EngagementStats> {
  const posts = await prisma.socialPost.findMany({ where: { competitorId } });
  const now = new Date();
  let total_likes = 0;
  let total_comments = 0;
  let total_views = 0;
  let total_shares = 0;
  let total_engagement = 0;
  const by_platform: EngagementStats['by_platform'] = {};
  const byDay: Record<number, { count: number; engagement: number }> = {};
  const byHour: Record<number, { count: number; engagement: number }> = {};
  let oldest: Date | null = null;

  for (const p of posts) {
    const eng = engagementOf(p);
    total_likes += p.likes;
    total_comments += p.comments;
    total_views += p.views;
    total_shares += p.shares;
    total_engagement += eng;
    const k = String(p.platform);
    if (!by_platform[k]) by_platform[k] = { count: 0, likes: 0, comments: 0, views: 0, shares: 0 };
    by_platform[k].count += 1;
    by_platform[k].likes += p.likes;
    by_platform[k].comments += p.comments;
    by_platform[k].views += p.views;
    by_platform[k].shares += p.shares;
    if (p.postedAt) {
      const d = new Date(p.postedAt);
      if (!oldest || d < oldest) oldest = d;
      const day = d.getDay();
      const hour = d.getHours();
      byDay[day] = byDay[day] ?? { count: 0, engagement: 0 };
      byDay[day].count += 1;
      byDay[day].engagement += eng;
      byHour[hour] = byHour[hour] ?? { count: 0, engagement: 0 };
      byHour[hour].count += 1;
      byHour[hour].engagement += eng;
    }
  }

  const n = posts.length;
  const weeksSpan = oldest ? Math.max(1, (now.getTime() - oldest.getTime()) / WEEK_MS) : 1;
  const top_post_ids = [...posts]
    .sort((a, b) => engagementOf(b) - engagementOf(a))
    .slice(0, TOP_POSTS_LIMIT)
    .map((p) => p.id);

  let best_day: string | null = null;
  let best_day_avg = -1;
  for (const [k, v] of Object.entries(byDay)) {
    const avg = v.engagement / Math.max(1, v.count);
    if (avg > best_day_avg) {
      best_day_avg = avg;
      best_day = DAY_NAMES[Number(k)] ?? null;
    }
  }
  let best_hour: number | null = null;
  let best_hour_avg = -1;
  for (const [k, v] of Object.entries(byHour)) {
    const avg = v.engagement / Math.max(1, v.count);
    if (avg > best_hour_avg) {
      best_hour_avg = avg;
      best_hour = Number(k);
    }
  }

  return {
    total_posts: n,
    total_likes,
    total_comments,
    total_views,
    total_shares,
    avg_likes: n ? total_likes / n : 0,
    avg_comments: n ? total_comments / n : 0,
    avg_views: n ? total_views / n : 0,
    avg_engagement: n ? total_engagement / n : 0,
    posts_per_week: n / weeksSpan,
    top_post_ids,
    best_hour,
    best_day,
    by_platform,
    updated_at: now.toISOString(),
  };
}

export async function computeSocialStats(competitorId: string): Promise<SocialStats> {
  const posts = await prisma.socialPost.findMany({
    where: { competitorId },
    orderBy: { likes: 'desc' },
  });
  const by_platform: SocialStats['by_platform'] = {};
  let total_likes = 0;
  let total_comments = 0;
  let total_views = 0;
  let total_engagement = 0;
  for (const p of posts) {
    total_likes += p.likes;
    total_comments += p.comments;
    total_views += p.views;
    total_engagement += engagementOf(p);
    const k = String(p.platform);
    if (!by_platform[k]) by_platform[k] = { count: 0, likes: 0, comments: 0, views: 0 };
    by_platform[k].count += 1;
    by_platform[k].likes += p.likes;
    by_platform[k].comments += p.comments;
    by_platform[k].views += p.views;
  }
  const top = posts[0];
  return {
    total_posts: posts.length,
    total_likes,
    total_comments,
    total_views,
    avg_engagement: posts.length ? total_engagement / posts.length : 0,
    by_platform,
    top_post: top
      ? {
          post_url: top.postUrl,
          caption: top.caption,
          likes: top.likes,
          comments: top.comments,
          platform: String(top.platform),
        }
      : null,
  };
}
