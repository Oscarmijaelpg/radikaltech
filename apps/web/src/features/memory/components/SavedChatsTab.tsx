import { Link } from 'react-router-dom';
import { Card, Skeleton } from '@radikal/ui';
import { useMemories } from '../api/memory';
import { CharacterEmpty } from '@/shared/ui/CharacterEmpty';

interface Props {
  projectId: string;
}

export function SavedChatsTab({ projectId }: Props) {
  const { data: items, isLoading } = useMemories(projectId, 'saved_chats');

  if (isLoading) return <Skeleton className="h-48" />;

  if (!items || items.length === 0) {
    return (
      <Card className="p-6">
        <CharacterEmpty
          character="ankor"
          title="No tienes chats guardados"
          message="Guarda conversaciones importantes desde el chat para que las recuerde y las use como contexto."
        />
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((item) => {
        const meta = (item.metadata ?? {}) as Record<string, unknown>;
        const chatId = typeof meta.chat_id === 'string' ? meta.chat_id : null;
        const body = (
          <>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-slate-400">bookmark</span>
              <div className="min-w-0">
                <h3 className="font-display font-bold text-slate-900 truncate">
                  {item.key || 'Chat guardado'}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 mt-1">{item.value}</p>
              </div>
            </div>
          </>
        );
        return (
          <Card key={item.id} className="p-5 hover:shadow-lg transition-shadow">
            {chatId ? (
              <Link to={`/chat/${chatId}`} className="block">
                {body}
              </Link>
            ) : (
              body
            )}
          </Card>
        );
      })}
    </div>
  );
}
