import type { ScheduledPostPlatform } from '../../api/scheduler';

export const PLATFORMS: Array<{ id: ScheduledPostPlatform; label: string; icon: string }> = [
  { id: 'instagram', label: 'Instagram', icon: 'photo_camera' },
  { id: 'tiktok', label: 'TikTok', icon: 'music_video' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'business' },
  { id: 'facebook', label: 'Facebook', icon: 'groups' },
  { id: 'x', label: 'X / Twitter', icon: 'alternate_email' },
  { id: 'threads', label: 'Threads', icon: 'forum' },
  { id: 'pinterest', label: 'Pinterest', icon: 'push_pin' },
  { id: 'youtube', label: 'YouTube', icon: 'smart_display' },
  { id: 'other', label: 'Otra', icon: 'public' },
];

export const platformIcon = (p: ScheduledPostPlatform) =>
  PLATFORMS.find((x) => x.id === p)?.icon ?? 'public';

export const platformLabel = (p: ScheduledPostPlatform) =>
  PLATFORMS.find((x) => x.id === p)?.label ?? p;

export function formatDay(d: Date) {
  return d.toLocaleDateString('es', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function formatTime(d: Date) {
  return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

export function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function toDatetimeLocalValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const MIN_FUTURE_MS = 10 * 60 * 1000;
export function minScheduledValue() {
  const d = new Date(Date.now() + MIN_FUTURE_MS);
  return toDatetimeLocalValue(d);
}

export interface DialogState {
  open: boolean;
  editingId: string | null;
  assetId: string | null;
  caption: string;
  hashtags: string[];
  hashtagDraft: string;
  platforms: ScheduledPostPlatform[];
  scheduledAt: string;
  notes: string;
}

export const initialDialogState: DialogState = {
  open: false,
  editingId: null,
  assetId: null,
  caption: '',
  hashtags: [],
  hashtagDraft: '',
  platforms: [],
  scheduledAt: minScheduledValue(),
  notes: '',
};
