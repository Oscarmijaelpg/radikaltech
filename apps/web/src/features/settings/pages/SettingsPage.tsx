import {
  Icon,
  SectionTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@radikal/ui';
import { AppearanceTab } from '../components/AppearanceTab';
import { DataTab } from '../components/DataTab';
import { NotificationsTab } from '../components/NotificationsTab';
import { ProfileTab } from '../components/ProfileTab';
import { SecurityTab } from '../components/SecurityTab';

export function SettingsPage() {
  return (
    <div className="min-h-full bg-gradient-to-br from-pink-50/40 via-white to-cyan-50/40">
      <div className="px-4 sm:px-6 md:px-8 pt-3 pb-1 max-w-5xl mx-auto flex items-center gap-1.5 text-[11px] text-slate-500">
        <Icon name="settings" className="text-[14px] text-[hsl(var(--color-primary))]" />
        <span className="font-semibold">Configurar</span>
        <span className="opacity-40">›</span>
        <span>Ajustes</span>
      </div>
      <div className="p-4 sm:p-6 md:p-8 pt-2 max-w-5xl mx-auto">
        <header className="mb-6 md:mb-8 relative overflow-hidden rounded-[20px] sm:rounded-[28px] md:rounded-[32px] bg-gradient-to-br from-slate-700 to-slate-900 p-4 sm:p-6 md:p-10 text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
          <div className="relative z-10 flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm grid place-items-center shrink-0">
              <Icon name="settings" className="text-[24px] sm:text-[32px]" />
            </div>
            <div>
              <SectionTitle className="opacity-80 text-white mb-1 sm:mb-2">Cuenta</SectionTitle>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-black tracking-tight">Ajustes</h1>
              <p className="text-white/70 mt-2">Personaliza tu experiencia en Radikal.</p>
            </div>
          </div>
        </header>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="flex-wrap overflow-x-auto">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
            <TabsTrigger value="appearance">Apariencia</TabsTrigger>
            <TabsTrigger value="security">Seguridad</TabsTrigger>
            <TabsTrigger value="data">Datos</TabsTrigger>
          </TabsList>

          <TabsContent value="profile"><ProfileTab /></TabsContent>
          <TabsContent value="notifications"><NotificationsTab /></TabsContent>
          <TabsContent value="appearance"><AppearanceTab /></TabsContent>
          <TabsContent value="security"><SecurityTab /></TabsContent>
          <TabsContent value="data"><DataTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
