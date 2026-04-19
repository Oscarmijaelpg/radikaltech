import type { SocialPostItem } from '../../api/memory';
import { NoSocialDataEmpty } from './NoSocialDataEmpty';
import { PostCard } from './PostCard';

interface Props {
  posts: SocialPostItem[] | undefined;
  competitorName: string;
}

export function PostsTab({ posts, competitorName }: Props) {
  if (!posts || posts.length === 0) {
    return <NoSocialDataEmpty competitorName={competitorName} />;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </div>
  );
}
