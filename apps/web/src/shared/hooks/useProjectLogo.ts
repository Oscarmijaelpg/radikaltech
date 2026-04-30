import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyzeBrightness } from '@radikal/ui';
import type { LogoBrightness } from '@radikal/ui';
import { api } from '../../lib/api';

export type { LogoBrightness };
export { useLogoBrightness, logoContainerStyle } from '@radikal/ui';

interface ContentAssetLite {
  id: string;
  asset_url: string;
  tags: string[] | null;
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
