import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

export type LogoBrightness = 'light' | 'dark' | 'unknown';

const LOGO_COLORS = {
  onLight: '#1e293b',
  onDark: '#ffffff',
  onUnknown: '#f1f5f9',
} as const;

export function analyzeBrightness(src: string): Promise<LogoBrightness> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve('unknown'); return; }
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        let totalBrightness = 0;
        let opaquePixels = 0;
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3]!;
          if (a < 30) continue;
          const r = data[i]!;
          const g = data[i + 1]!;
          const b = data[i + 2]!;
          totalBrightness += (r * 299 + g * 587 + b * 114) / 1000;
          opaquePixels++;
        }
        if (opaquePixels === 0) { resolve('light'); return; }
        resolve(totalBrightness / opaquePixels > 180 ? 'light' : 'dark');
      } catch {
        resolve('unknown');
      }
    };
    img.onerror = () => resolve('unknown');
    img.src = src;
  });
}

export function useLogoBrightness(url: string | null | undefined): LogoBrightness {
  const [brightness, setBrightness] = useState<LogoBrightness>('unknown');
  useEffect(() => {
    if (!url) { setBrightness('unknown'); return; }
    void analyzeBrightness(url).then(setBrightness);
  }, [url]);
  return brightness;
}

export function logoContainerStyle(brightness: LogoBrightness): CSSProperties {
  return {
    backgroundColor:
      brightness === 'light' ? LOGO_COLORS.onLight
      : brightness === 'dark' ? LOGO_COLORS.onDark
      : LOGO_COLORS.onUnknown,
  };
}
