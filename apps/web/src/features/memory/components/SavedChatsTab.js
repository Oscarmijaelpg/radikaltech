import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
import { Card, Skeleton } from '@radikal/ui';
import { useMemories } from '../api/memory';
import { CharacterEmpty } from '@/shared/ui/CharacterEmpty';
export function SavedChatsTab({ projectId }) {
    const { data: items, isLoading } = useMemories(projectId, 'saved_chats');
    if (isLoading)
        return _jsx(Skeleton, { className: "h-48" });
    if (!items || items.length === 0) {
        return (_jsx(Card, { className: "p-6", children: _jsx(CharacterEmpty, { character: "ankor", title: "No tienes chats guardados", message: "Guarda conversaciones importantes desde el chat para que las recuerde y las use como contexto." }) }));
    }
    return (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: items.map((item) => {
            const meta = (item.metadata ?? {});
            const chatId = typeof meta.chat_id === 'string' ? meta.chat_id : null;
            const body = (_jsx(_Fragment, { children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx("span", { className: "material-symbols-outlined text-slate-400", children: "bookmark" }), _jsxs("div", { className: "min-w-0", children: [_jsx("h3", { className: "font-display font-bold text-slate-900 truncate", children: item.key || 'Chat guardado' }), _jsx("p", { className: "text-xs text-slate-500 line-clamp-2 mt-1", children: item.value })] })] }) }));
            return (_jsx(Card, { className: "p-5 hover:shadow-lg transition-shadow", children: chatId ? (_jsx(Link, { to: `/chat/${chatId}`, className: "block", children: body })) : (body) }, item.id));
        }) }));
}
