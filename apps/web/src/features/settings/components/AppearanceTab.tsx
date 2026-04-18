import { useEffect, useState } from 'react';
import { Card, RadioGroup, RadioGroupItem, Switch } from '@radikal/ui';
import { useToast } from '@/shared/ui/Toaster';
import { COLOR_KEY, COLOR_PRESETS, DARKMODE_KEY, DENSITY_KEY } from './constants';

function applyColor(hsl: string) {
  document.documentElement.style.setProperty('--color-primary', hsl);
}

function applyDensity(density: 'compact' | 'comfortable') {
  document.documentElement.dataset.density = density;
}

export function AppearanceTab() {
  const { toast } = useToast();
  const [color, setColor] = useState(() => {
    try {
      return localStorage.getItem(COLOR_KEY) ?? 'pink';
    } catch {
      return 'pink';
    }
  });
  const [density, setDensity] = useState<'compact' | 'comfortable'>(() => {
    try {
      return (localStorage.getItem(DENSITY_KEY) as 'compact' | 'comfortable' | null) ?? 'comfortable';
    } catch {
      return 'comfortable';
    }
  });
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem(DARKMODE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const preset = COLOR_PRESETS.find((c) => c.id === color);
    if (preset) applyColor(preset.hsl);
    try {
      localStorage.setItem(COLOR_KEY, color);
    } catch {
      /* noop */
    }
  }, [color]);

  useEffect(() => {
    applyDensity(density);
    try {
      localStorage.setItem(DENSITY_KEY, density);
    } catch {
      /* noop */
    }
  }, [density]);

  const toggleDark = (v: boolean) => {
    setDarkMode(v);
    document.documentElement.classList.toggle('dark', v);
    try {
      localStorage.setItem(DARKMODE_KEY, v ? '1' : '0');
    } catch {
      /* noop */
    }
    toast({
      title: v ? 'Modo oscuro activado' : 'Modo claro activado',
      description: 'Algunas secciones pueden verse incompletas — integración total en progreso.',
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-6 md:p-8 space-y-4">
        <div>
          <h3 className="font-bold text-slate-900">Modo oscuro</h3>
          <p className="text-sm text-slate-500">Cambia el tema de la interfaz</p>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-slate-800">Activar modo oscuro</p>
            <p className="text-xs text-slate-500">
              Funcionalidad en progreso — integración completa próximamente
            </p>
          </div>
          <Switch checked={darkMode} onCheckedChange={toggleDark} />
        </div>
      </Card>

      <Card className="p-4 sm:p-6 md:p-8 space-y-4">
        <div>
          <h3 className="font-bold text-slate-900">Color principal</h3>
          <p className="text-sm text-slate-500">Elige el color de acento para toda la app</p>
        </div>
        <RadioGroup value={color} onValueChange={setColor} className="grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
          {COLOR_PRESETS.map((preset) => (
            <label
              key={preset.id}
              htmlFor={`color-${preset.id}`}
              className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                color === preset.id ? 'border-[hsl(var(--color-primary))] bg-slate-50' : 'border-slate-200'
              }`}
            >
              <RadioGroupItem id={`color-${preset.id}`} value={preset.id} />
              <span
                className="w-6 h-6 rounded-full shrink-0 border border-white shadow"
                style={{ backgroundColor: preset.hex }}
              />
              <span className="font-semibold text-sm">{preset.label}</span>
            </label>
          ))}
        </RadioGroup>
      </Card>

      <Card className="p-4 sm:p-6 md:p-8 space-y-4">
        <div>
          <h3 className="font-bold text-slate-900">Densidad</h3>
          <p className="text-sm text-slate-500">Espaciado general de la interfaz</p>
        </div>
        <RadioGroup
          value={density}
          onValueChange={(v) => setDensity(v as 'compact' | 'comfortable')}
          className="grid-cols-1 sm:grid-cols-2"
        >
          {[
            { id: 'comfortable', label: 'Cómoda', desc: 'Más espacio, recomendada' },
            { id: 'compact', label: 'Compacta', desc: 'Más contenido visible' },
          ].map((opt) => (
            <label
              key={opt.id}
              htmlFor={`density-${opt.id}`}
              className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                density === opt.id ? 'border-[hsl(var(--color-primary))] bg-slate-50' : 'border-slate-200'
              }`}
            >
              <RadioGroupItem id={`density-${opt.id}`} value={opt.id} />
              <span>
                <span className="block font-semibold text-sm">{opt.label}</span>
                <span className="block text-xs text-slate-500">{opt.desc}</span>
              </span>
            </label>
          ))}
        </RadioGroup>
      </Card>
    </div>
  );
}
