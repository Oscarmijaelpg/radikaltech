import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface ContentAssetLite {
  id: string;
  asset_url: string;
  tags: string[] | null;
}

export type LogoBrightness = 'light' | 'dark' | 'unknown';

function analyzeBrightness(src: string): Promise<LogoBrightness> {
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
        const avg = totalBrightness / opaquePixels;
        resolve(avg > 180 ? 'light' : 'dark');
      } catch {
        resolve('unknown');
      }
    };
    img.onerror = () => resolve('unknown');
    img.src = src;
  });
}

export function useProjectLogo(projectId: string | null | undefined): string | null {
  const result = useProjectLogoWithBrightness(projectId);
  return result.url;
}

export function useProjectLogoWithBrightness(projectId: string | null | undefined): {
  url: string | null;
  brightness: LogoBrightness;
} {
  const { data } = useQuery({
    queryKey: ['content', 'list', projectId, { type: 'image' }],
    queryFn: async () => {
      const res = await api.get<{ data: ContentAssetLite[] }>(
        `/content?project_id=${projectId}&type=image&limit=100`,
      );
      return res.data;
    },
    enabled: !!projectId,
    staleTime: 60_000,
  });

  const logo = data?.find((a) => a.tags?.includes('logo'));
  const url = logo?.asset_url ?? null;

  const [brightness, setBrightness] = useState<LogoBrightness>('unknown');

  useEffect(() => {
    if (!url) { setBrightness('unknown'); return; }
    void analyzeBrightness(url).then(setBrightness);
  }, [url]);

  return { url, brightness };
}

export function useLogoBrightness(url: string | null | undefined): LogoBrightness {
  const [brightness, setBrightness] = useState<LogoBrightness>('unknown');
  useEffect(() => {
    if (!url) { setBrightness('unknown'); return; }
    void analyzeBrightness(url).then(setBrightness);
  }, [url]);
  return brightness;
}

export function logoContainerStyle(brightness: LogoBrightness): React.CSSProperties {
  return {
    backgroundColor:
      brightness === 'light' ? '#1e293b' :
      brightness === 'dark' ? '#ffffff' :
      '#f1f5f9',
  };
}
