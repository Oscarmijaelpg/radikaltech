import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/shared/ui/Toaster';
import { useMarkNotificationRead } from '../api/notifications';
export function JobFailureToasts() {
    const { session } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const markRead = useMarkNotificationRead();
    const seenRef = useRef(new Set());
    const primedRef = useRef(false);
    const q = useQuery({
        queryKey: ['notifications', 'job-failures-watch'],
        queryFn: async () => {
            const r = await api.get('/notifications?unread_only=true&limit=20');
            return r.data;
        },
        enabled: !!session,
        refetchInterval: 8000,
    });
    useEffect(() => {
        const items = q.data?.items ?? [];
        const failures = items.filter((n) => n.kind === 'job_failed');
        if (!primedRef.current) {
            for (const n of failures)
                seenRef.current.add(n.id);
            primedRef.current = true;
            return;
        }
        for (const n of failures) {
            if (seenRef.current.has(n.id))
                continue;
            seenRef.current.add(n.id);
            toast({
                title: n.title,
                description: n.body ?? undefined,
                variant: 'error',
                duration: 10000,
                onClick: n.actionUrl
                    ? () => {
                        markRead.mutate(n.id);
                        navigate(n.actionUrl);
                    }
                    : undefined,
            });
        }
    }, [q.data, toast, navigate, markRead]);
    return null;
}
