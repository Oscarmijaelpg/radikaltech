import { SocialPlatform } from '../enums.js';

export interface SocialPlatformMeta {
  id: SocialPlatform;
  name: string;
  icon: string;
  color: string;
}

export const SOCIAL_PLATFORMS: readonly SocialPlatformMeta[] = [
  {
    id: SocialPlatform.INSTAGRAM,
    name: 'Instagram',
    icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/instagram.svg',
    color: '#E4405F',
  },
  {
    id: SocialPlatform.TIKTOK,
    name: 'TikTok',
    icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/tiktok.svg',
    color: '#000000',
  },
  {
    id: SocialPlatform.LINKEDIN,
    name: 'LinkedIn',
    icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/linkedin.svg',
    color: '#0A66C2',
  },
  {
    id: SocialPlatform.YOUTUBE,
    name: 'YouTube',
    icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/youtube.svg',
    color: '#FF0000',
  },
  {
    id: SocialPlatform.FACEBOOK,
    name: 'Facebook',
    icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/facebook.svg',
    color: '#1877F2',
  },
  {
    id: SocialPlatform.X,
    name: 'X',
    icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/x.svg',
    color: '#000000',
  },
  {
    id: SocialPlatform.THREADS,
    name: 'Threads',
    icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/threads.svg',
    color: '#000000',
  },
  {
    id: SocialPlatform.PINTEREST,
    name: 'Pinterest',
    icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/pinterest.svg',
    color: '#BD081C',
  },
] as const;
