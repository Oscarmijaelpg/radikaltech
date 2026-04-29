
export interface MenuItem {
    label: string;
    path: string;
    icon: string;
    tab?: string;
}

export const ARCHIVE_MENU_ITEMS: MenuItem[] = [
    {
        label: 'Mi marca',
        path: '/?tab=brand',
        icon: 'verified',
        tab: 'brand'
    },
    {
        label: 'Noticias',
        path: '/?tab=news',
        icon: 'bolt',
        tab: 'news'
    },
    {
        label: 'Mi Competencia',
        path: '/?tab=competition',
        icon: 'insights',
        tab: 'competition'
    },
    {
        label: 'Mis Archivos',
        path: '/?tab=neuronas',
        icon: 'psychology',
        tab: 'neuronas'
    },
    {
        label: 'Generación de contenido',
        path: '/content',
        icon: 'auto_awesome',
        tab: 'content'
    },
    {
        label: 'Mi equipo',
        path: '/team',
        icon: 'groups',
        tab: 'team'
    }
];
