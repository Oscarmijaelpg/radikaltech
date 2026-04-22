import { useCallback } from 'react';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { useActionPrices, useCreditBalance } from '../api/credits';

// Acciones por debajo de este costo no piden confirmación (chat, embeddings,
// captions, etc). Mantener bajo y simple — los users no quieren un popup por
// cada mensaje. Este umbral aplica a la UX, no al cobro real (que siempre ocurre).
const CONFIRM_THRESHOLD = 50;

interface ChargeConfirmOptions {
  // Texto extra que se muestra debajo del costo (opcional). Útil para describir
  // qué se va a hacer en concreto (ej. "Generarás 4 imágenes").
  detail?: string;
}

export function useChargeConfirm() {
  const confirm = useConfirm();
  const { data: prices } = useActionPrices();
  const { data: balance } = useCreditBalance();

  return useCallback(
    async (actionKey: string, opts: ChargeConfirmOptions = {}): Promise<boolean> => {
      const price = prices?.find((p) => p.key === actionKey);
      // Si no encontramos precio (cache cargando o acción gratuita) no bloqueamos.
      if (!price || price.monedas < CONFIRM_THRESHOLD) return true;

      const current = balance?.balance ?? 0;
      const insufficient = current < price.monedas;

      const description = [
        opts.detail,
        insufficient
          ? `Necesitas ${price.monedas} monedas y tienes ${current}. Te faltarán ${price.monedas - current}.`
          : `Tu saldo después: ${current - price.monedas} monedas.`,
      ]
        .filter(Boolean)
        .join('\n\n');

      return confirm({
        title: `Esta acción consume ${price.monedas} monedas`,
        description,
        confirmLabel: insufficient ? 'Continuar igual' : 'Continuar',
        cancelLabel: 'Cancelar',
      });
    },
    [confirm, prices, balance],
  );
}
