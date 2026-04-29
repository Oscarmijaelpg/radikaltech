import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ARCHIVE_MENU_ITEMS } from '../../utils/menuConfig';

interface ArchiveHeaderProps {
    onAddKnowledge: () => void;
    activeTab?: string;
}

export const ArchiveHeader: React.FC<ArchiveHeaderProps> = ({ onAddKnowledge, activeTab: propActiveTab }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const getActiveTab = () => {
        if (propActiveTab) return propActiveTab;
        const currentPath = location.pathname;
        const searchParams = new URLSearchParams(location.search);
        const tabParam = searchParams.get('tab');

        if (currentPath === '/content') return 'content';
        if (currentPath === '/team') return 'team';
        if (tabParam === 'brand') return 'brand';
        if (tabParam === 'neuronas') return 'neuronas';
        if (tabParam === 'competition') return 'competition';
        if (tabParam === 'news') return 'news';
        if (currentPath === '/' && !tabParam) return 'brand';
        return 'brand';
    };

    const activeTab = getActiveTab();

    const handleTabChange = (path: string) => {
        navigate(path);
    };

    return (
        <header className="py-3 flex items-center justify-between px-4 md:px-8 bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-20 gap-3">
            {/* Left: title + scrollable tabs */}
            <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                <h1 className="text-base font-bold font-display text-slate-900 shrink-0 hidden sm:block">Herramientas</h1>
                <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar min-w-0">
                    {ARCHIVE_MENU_ITEMS.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => handleTabChange(item.path)}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === item.tab ? 'bg-white text-[hsl(var(--color-primary))] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Right: compact add button — icon only on small screens */}
            <button
                onClick={onAddKnowledge}
                title="Añadir conocimiento"
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[hsl(var(--color-primary))] text-white text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm"
            >
                <span className="material-symbols-outlined text-[18px] leading-none">add</span>
                <span className="hidden lg:inline whitespace-nowrap">Añadir conocimiento</span>
            </button>
        </header>
    );
};
