import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@radikal/ui';
import { clsx } from 'clsx';
import { useAuth } from '@/providers/AuthProvider';
import radikalLogo from '@/media/radikal-logo.png';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Panel', icon: 'dashboard' },
  { to: '/users', label: 'Usuarios', icon: 'group' },
  { to: '/projects', label: 'Proyectos', icon: 'folder_special' },
  { to: '/jobs', label: 'Tareas', icon: 'task_alt' },
  { to: '/moderation', label: 'Moderación', icon: 'gavel' },
  { to: '/broadcast', label: 'Notificaciones', icon: 'campaign' },
  { to: '/scheduled-reports', label: 'Reportes programados', icon: 'event_repeat' },
  { to: '/prices', label: 'Precios', icon: 'paid' },
  { to: '/providers', label: 'Proveedores', icon: 'hub' },
  { to: '/flags', label: 'Feature flags', icon: 'flag' },
  { to: '/audit', label: 'Historial', icon: 'history' },
  { to: '/config', label: 'Configuración', icon: 'settings' },
];

function getInitials(name?: string | null) {
  if (!name) return '??';
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface SidebarContentProps {
  onNavigate?: () => void;
}

function SidebarContent({ onNavigate }: SidebarContentProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const userInitials = getInitials(profile?.full_name ?? profile?.email ?? '?');

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <>
      <div className="px-6 py-6 border-b border-[hsl(var(--color-border))] flex flex-col items-start">
        <img src={radikalLogo} alt="Radikal" className="h-10 w-auto" />
        <p className="text-[10px] font-black uppercase tracking-tighter opacity-50 mt-2">
          Consola de administración
        </p>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto custom-scrollbar">
        <div className="space-y-1">
          {NAV.map((item) => {
            const active =
              item.to === '/'
                ? location.pathname === '/'
                : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onNavigate}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all min-h-[48px]',
                  active
                    ? 'bg-[hsl(var(--color-primary))] text-white shadow-lg shadow-[hsl(var(--color-primary)/0.35)]'
                    : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                <Icon name={item.icon} className="text-[20px] shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      <div className="px-3 py-4 border-t border-[hsl(var(--color-border))]">
        <div className="flex items-center gap-3 p-2 mb-2 min-h-[52px]">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] grid place-items-center text-white font-bold text-sm shrink-0 overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              userInitials
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">
              {profile?.full_name ?? 'Administrador'}
            </p>
            <p className="text-[11px] text-slate-500 truncate">{profile?.email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full px-4 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 min-h-[48px]"
        >
          <Icon name="logout" className="text-[18px]" />
          Cerrar sesión
        </button>
      </div>
    </>
  );
}

export function AdminShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (drawerOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && drawerOpen) setDrawerOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  return (
    <div className="min-h-screen lg:h-screen lg:flex bg-gradient-to-br from-pink-50/30 via-white to-cyan-50/30 lg:overflow-hidden text-slate-900">
      <header
        className={clsx(
          'lg:hidden sticky top-0 z-30',
          'bg-white/90 backdrop-blur-xl',
          'border-b border-[hsl(var(--color-border))]',
          'flex items-center gap-3 px-4',
          'pt-[env(safe-area-inset-top)]',
        )}
        style={{ height: `calc(3.5rem + env(safe-area-inset-top, 0px))` }}
      >
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir menú"
          className="w-11 h-11 -ml-2 grid place-items-center rounded-xl hover:bg-slate-100 active:bg-slate-200 transition-colors"
        >
          <Icon name="menu" />
        </button>
        <img src={radikalLogo} alt="Radikal" className="h-7 w-auto" />
        <span className="text-xs font-semibold text-slate-500">Admin</span>
      </header>

      <aside className="hidden lg:flex w-72 shrink-0 border-r border-[hsl(var(--color-border))] bg-white/60 backdrop-blur-xl flex-col h-screen sticky top-0">
        <SidebarContent />
      </aside>

      <div
        className={clsx(
          'lg:hidden fixed inset-0 z-50 transition-visibility',
          drawerOpen ? 'visible' : 'invisible pointer-events-none',
        )}
        role="dialog"
        aria-modal="true"
      >
        <div
          className={clsx(
            'absolute inset-0 bg-black/50 transition-opacity duration-300',
            drawerOpen ? 'opacity-100' : 'opacity-0',
          )}
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />
        <aside
          className={clsx(
            'absolute left-0 top-0 bottom-0 w-[85vw] max-w-[320px] bg-white flex flex-col shadow-2xl',
            'transition-transform duration-300 ease-out',
            'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]',
            drawerOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar menú"
            className="absolute top-3 right-3 w-10 h-10 grid place-items-center rounded-xl hover:bg-slate-100 active:bg-slate-200 transition-colors z-10"
          >
            <Icon name="close" className="text-slate-500" />
          </button>
          <SidebarContent onNavigate={() => setDrawerOpen(false)} />
        </aside>
      </div>

      <main className="flex-1 lg:overflow-y-auto lg:h-screen relative overflow-x-hidden pb-[env(safe-area-inset-bottom)]">
        <Outlet />
      </main>
    </div>
  );
}
