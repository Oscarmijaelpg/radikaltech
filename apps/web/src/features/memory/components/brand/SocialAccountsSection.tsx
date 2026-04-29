import { Badge, Card } from '@radikal/ui';
import type { SocialAccount } from '../../api/memory';
import { SectionTitle, SocialIcon } from './shared';

export function SocialAccountsSection({ accounts }: { accounts: SocialAccount[] }) {
  if (!accounts || accounts.length === 0) return null;
  return (
    <Card className="p-4 sm:p-6 md:p-8 bg-gradient-to-br from-cyan-50 to-pink-50 border-white">
      <SectionTitle icon="hub">Redes sociales conectadas</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-3">
        {accounts.map((s) => {
          const label = s.handle || s.url || s.platform;
          const content = (
            <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white shadow-md border border-white hover:shadow-lg transition-all">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-cyan-500 grid place-items-center text-white">
                <SocialIcon platform={s.platform} />
              </span>
              <span className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                  {s.platform}
                </span>
                <span className="text-sm font-bold text-slate-800">{label}</span>
              </span>
              {typeof s.followers === 'number' && s.followers > 0 && (
                <Badge variant="muted" className="ml-2">
                  {s.followers.toLocaleString()} seguidores
                </Badge>
              )}
            </span>
          );
          return s.url ? (
            <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer">
              {content}
            </a>
          ) : (
            <div key={s.id}>{content}</div>
          );
        })}
      </div>
    </Card>
  );
}
