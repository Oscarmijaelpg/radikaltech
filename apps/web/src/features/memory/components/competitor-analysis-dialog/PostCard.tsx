import { useState } from 'react';
import { Badge } from '@radikal/ui';
import type { SocialPostItem } from '../../api/memory';
import { fmtNumber } from './format';

interface Props {
  post: SocialPostItem;
}

export function PostCard({ post }: Props) {
  const [showVisual, setShowVisual] = useState(false);
  const va = post.visual_analysis ?? null;
  return (
    <div className="group relative rounded-2xl border border-slate-200 overflow-hidden bg-white flex flex-col">
      <a
        href={post.post_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative aspect-square bg-slate-100"
      >
        {post.image_url ? (
          <img
            src={post.image_url}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
            sin imagen
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end p-2">
          <span className="opacity-0 group-hover:opacity-100 text-white text-[10px] uppercase tracking-widest font-black">
            Abrir post
          </span>
        </div>
      </a>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-xs text-slate-700 line-clamp-2 min-h-[32px]">{post.caption ?? '—'}</p>
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary">{post.platform}</Badge>
          <Badge variant="secondary">♥ {fmtNumber(post.likes)}</Badge>
          <Badge variant="secondary">💬 {fmtNumber(post.comments)}</Badge>
        </div>
        {va && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowVisual((v) => !v)}
              className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--color-primary))] hover:underline"
            >
              {showVisual ? 'Ocultar' : 'Análisis visual'}
            </button>
            {showVisual && (
              <div className="mt-2 p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                {va.description && <p className="text-xs text-slate-700">{va.description}</p>}
                {va.dominant_colors && va.dominant_colors.length > 0 && (
                  <div className="flex gap-1">
                    {va.dominant_colors.map((c, i) => (
                      <span
                        key={i}
                        title={c}
                        className="w-5 h-5 rounded-md border border-slate-300"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                )}
                {va.style_tags && va.style_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {va.style_tags.map((t, i) => (
                      <Badge key={i} variant="outline">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
