import {
  Button,
  Icon,
} from '@radikal/ui';
import onboardingVideo from '@/media/onboarding.mp4';
import radikalLogo from '@/media/radikal-logo.png';

interface WelcomeStepProps {
  onStart: () => void;
}

export function WelcomeStep({ onStart }: WelcomeStepProps) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10 items-center">
      <div className="order-2 md:order-1 flex flex-col gap-6">
        <span className="self-start px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest border border-amber-200 shadow-sm">
          Desarrollo · v1.0
        </span>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-black tracking-tight">
            ¡Hola! Bienvenido a
          </h1>
          <img src={radikalLogo} alt="Radikal" className="h-12 md:h-14 w-auto" />
        </div>
        <p className="text-base sm:text-lg text-[hsl(var(--color-muted))] leading-relaxed">
          En unos pocos pasos vamos a entender tu negocio para que la IA trabaje como un socio
          estratégico, no como un asistente genérico.
        </p>
        <ul className="grid gap-2 text-sm text-[hsl(var(--color-foreground))]">
          <li className="flex items-center gap-2">
            <Icon name="check_circle" className="text-[hsl(var(--color-primary))] text-[18px]" />
            Cuéntanos sobre tu empresa e industria
          </li>
          <li className="flex items-center gap-2">
            <Icon name="check_circle" className="text-[hsl(var(--color-primary))] text-[18px]" />
            Conecta tu sitio web y redes (opcional)
          </li>
          <li className="flex items-center gap-2">
            <Icon name="check_circle" className="text-[hsl(var(--color-primary))] text-[18px]" />
            Define tono de marca y objetivos
          </li>
        </ul>
        <Button size="lg" onClick={onStart} className="self-start mt-2">
          Empezar
          <Icon name="arrow_forward" className="text-[20px]" />
        </Button>
      </div>
      <div className="order-1 md:order-2 relative">
        <video
          src={onboardingVideo}
          autoPlay
          loop
          muted
          playsInline
          className="w-full rounded-3xl shadow-2xl border-4 border-white"
        />
      </div>
    </div>
  );
}
