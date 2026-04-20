import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Icon,
} from '@radikal/ui';
import { cn } from '@/shared/utils/cn';
import onboardingVideo from '@/media/onboarding.mp4';
import radikalLogo from '@/media/radikal-logo.png';

interface WelcomeStepProps {
  onStart: () => void;
}

type VideoWithWebkit = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
};

export function WelcomeStep({ onStart }: WelcomeStepProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<VideoWithWebkit>(null);
  const [playing, setPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFsChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (!active) {
        const el = videoRef.current;
        if (el) {
          el.pause();
          el.currentTime = 0;
          el.muted = true;
        }
        setPlaying(false);
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handlePlay = async () => {
    const vid = videoRef.current;
    const container = containerRef.current;
    if (!vid) return;
    try {
      vid.muted = false;
      vid.currentTime = 0;
      if (typeof vid.webkitEnterFullscreen === 'function') {
        vid.webkitEnterFullscreen();
      } else if (container?.requestFullscreen) {
        await container.requestFullscreen();
      }
      await vid.play();
      setPlaying(true);
    } catch {
      vid.muted = false;
      try {
        await vid.play();
        setPlaying(true);
      } catch {
        /* ignore autoplay rejection */
      }
    }
  };

  const handleClose = async () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen();
    } else {
      const vid = videoRef.current;
      if (vid) {
        vid.pause();
        vid.currentTime = 0;
        vid.muted = true;
      }
      setPlaying(false);
    }
  };

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
      <div
        ref={containerRef}
        className="order-1 md:order-2 relative group bg-black rounded-3xl overflow-hidden"
      >
        {/* TODO: reemplazar onboarding.mp4 — el archivo actual tiene watermark de VEO 3. */}
        <video
          ref={videoRef}
          src={onboardingVideo}
          preload="metadata"
          playsInline
          muted
          controls={isFullscreen}
          className={cn(
            'w-full rounded-3xl shadow-2xl border-4 border-white',
            isFullscreen && 'w-screen h-screen rounded-none border-0 object-contain',
          )}
          onEnded={() => setPlaying(false)}
        />
        {!playing && (
          <button
            type="button"
            onClick={() => void handlePlay()}
            aria-label="Reproducir video de bienvenida"
            className="absolute inset-0 grid place-items-center rounded-3xl bg-black/20 hover:bg-black/30 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-[hsl(var(--color-primary))]"
          >
            <span className="flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/95 shadow-2xl text-[hsl(var(--color-primary))] group-hover:scale-105 transition-transform">
              <Icon name="play_arrow" className="text-[56px] sm:text-[64px] translate-x-0.5" />
            </span>
          </button>
        )}
        {isFullscreen && (
          <button
            type="button"
            onClick={() => void handleClose()}
            aria-label="Cerrar video"
            className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 w-12 h-12 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-sm text-white grid place-items-center shadow-2xl transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
          >
            <Icon name="close" className="text-[24px]" />
          </button>
        )}
      </div>
    </div>
  );
}
