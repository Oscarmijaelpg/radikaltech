import type { SocialPostItem } from '../../api/memory';
import { PostCard } from './PostCard';
import { ReportSection } from './ReportSection';

interface Props {
  posts: SocialPostItem[] | undefined;
}

export function TopPostsSection({ posts }: Props) {
  const list = posts ?? [];
  const top = [...list]
    .sort((a, b) => (b.likes ?? 0) + (b.comments ?? 0) * 3 - ((a.likes ?? 0) + (a.comments ?? 0) * 3))
    .slice(0, 8);

  return (
    <ReportSection
      icon="trending_up"
      title="Top posts"
      subtitle="Las publicaciones con más engagement"
    >
      {top.length === 0 ? (
        <p className="text-sm text-slate-500">
          Sin posts aún. Actualiza las redes en la sección de Presencia digital.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {top.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </ReportSection>
  );
}
