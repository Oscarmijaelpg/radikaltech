import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qs } from '@/shared/lib/qs';

export interface AuditEntry {
  id: string;
  actorId: string;
  actorEmail: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  diff: unknown;
  metadata: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export function useAuditLog(filters: object) {
  return useQuery({
    queryKey: ['admin', 'audit', filters],
    queryFn: () => api.get<PaginatedResponse<AuditEntry>>(`/admin/audit${qs(filters)}`),
    placeholderData: (prev) => prev,
  });
}
