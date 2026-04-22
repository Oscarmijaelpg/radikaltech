import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/shared/ui/Toaster';

interface PaymentRequiredDetail {
  message?: string;
  details?: { required?: number; balance?: number; actionKey?: string };
}

const COOLDOWN_MS = 3000;

// Listens for `radikal:payment-required` events emitted by api.ts when a 402
// response arrives, and shows a toast that links to the credits page.
export function PaymentRequiredToaster() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const lastAt = useRef(0);

  useEffect(() => {
    const handler = (ev: Event) => {
      const now = Date.now();
      if (now - lastAt.current < COOLDOWN_MS) return;
      lastAt.current = now;

      const detail = (ev as CustomEvent<PaymentRequiredDetail>).detail ?? {};
      const required = detail.details?.required;
      const balance = detail.details?.balance;
      const description =
        required != null && balance != null
          ? `Necesitas ${required} monedas · tienes ${balance}`
          : detail.message ?? 'Saldo insuficiente';

      qc.invalidateQueries({ queryKey: ['credits', 'balance'] });

      toast({
        variant: 'warning',
        title: 'Saldo insuficiente',
        description,
        onClick: () => navigate('/settings/credits'),
      });
    };

    window.addEventListener('radikal:payment-required', handler);
    return () => window.removeEventListener('radikal:payment-required', handler);
  }, [toast, navigate, qc]);

  return null;
}
