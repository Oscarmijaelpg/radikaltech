import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: { NODE_ENV: 'test', WEB_URL: 'http://localhost:3000', LOG_LEVEL: 'silent' },
}));

const charge = vi.fn();
const refund = vi.fn();

vi.mock('../../src/modules/credits/service.js', () => ({
  creditService: { charge, refund },
}));

describe('withCredits helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    charge.mockReset();
    refund.mockReset();
  });

  it('cobra antes de ejecutar y retorna el resultado de fn', async () => {
    charge.mockResolvedValue({ balance: 90, charged: 10, transactionId: 'tx-1' });
    const { withCredits } = await import('../../src/lib/credits.js');

    const result = await withCredits(
      { userId: 'u1', actionKey: 'chat.message' },
      async () => 'ok',
    );

    expect(result).toBe('ok');
    expect(charge).toHaveBeenCalledWith({
      userId: 'u1',
      actionKey: 'chat.message',
      metadata: undefined,
    });
    expect(refund).not.toHaveBeenCalled();
  });

  it('reembolsa automáticamente cuando fn lanza', async () => {
    charge.mockResolvedValue({ balance: 90, charged: 10, transactionId: 'tx-2' });
    refund.mockResolvedValue({ balance: 100, refunded: 10, transactionId: 'tx-refund' });
    const { withCredits } = await import('../../src/lib/credits.js');

    await expect(
      withCredits({ userId: 'u1', actionKey: 'image.generate' }, async () => {
        throw new Error('proveedor caído');
      }),
    ).rejects.toThrow('proveedor caído');

    expect(refund).toHaveBeenCalledWith({
      transactionId: 'tx-2',
      reason: expect.stringContaining('proveedor caído'),
    });
  });

  it('propaga el error de charge sin ejecutar fn', async () => {
    const chargeErr = new Error('Saldo insuficiente');
    charge.mockRejectedValue(chargeErr);
    const fn = vi.fn();
    const { withCredits } = await import('../../src/lib/credits.js');

    await expect(
      withCredits({ userId: 'u1', actionKey: 'image.generate' }, fn),
    ).rejects.toThrow('Saldo insuficiente');

    expect(fn).not.toHaveBeenCalled();
    expect(refund).not.toHaveBeenCalled();
  });

  it('no oculta el error original si el refund falla', async () => {
    charge.mockResolvedValue({ balance: 90, charged: 10, transactionId: 'tx-3' });
    refund.mockRejectedValue(new Error('DB down'));
    const { withCredits } = await import('../../src/lib/credits.js');

    await expect(
      withCredits({ userId: 'u1', actionKey: 'image.generate' }, async () => {
        throw new Error('original fail');
      }),
    ).rejects.toThrow('original fail');
  });

  it('pasa metadata al charge', async () => {
    charge.mockResolvedValue({ balance: 90, charged: 10, transactionId: 'tx-4' });
    const { withCredits } = await import('../../src/lib/credits.js');

    await withCredits(
      { userId: 'u1', actionKey: 'website.analyze', metadata: { url: 'https://a.com' } },
      async () => undefined,
    );

    expect(charge).toHaveBeenCalledWith({
      userId: 'u1',
      actionKey: 'website.analyze',
      metadata: { url: 'https://a.com' },
    });
  });
});
