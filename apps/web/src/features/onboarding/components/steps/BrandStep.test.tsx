import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrandStep } from './BrandStep';

describe('BrandStep (onboarding)', () => {
  it('renderiza el título, los campos y los botones', () => {
    render(<BrandStep onSubmit={vi.fn()} onBack={vi.fn()} />);

    expect(screen.getByText('Tu marca')).toBeInTheDocument();
    expect(screen.getByText('Tono de voz')).toBeInTheDocument();
    expect(screen.getByLabelText(/Audiencia objetivo/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ventaja competitiva/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continuar/ })).toBeInTheDocument();
  });

  it('precompleta desde defaultValues', () => {
    render(
      <BrandStep
        onSubmit={vi.fn()}
        onBack={vi.fn()}
        defaultValues={{
          target_audience: 'CMOs de startups B2B',
          brand_story: 'Simplificamos inteligencia de marca con IA',
          values: ['velocidad', 'transparencia'],
        }}
      />,
    );

    expect(screen.getByDisplayValue('CMOs de startups B2B')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Simplificamos inteligencia de marca con IA')).toBeInTheDocument();
    expect(screen.getByText('velocidad')).toBeInTheDocument();
    expect(screen.getByText('transparencia')).toBeInTheDocument();
  });

  it('agrega un valor de marca al escribir y presionar Enter', async () => {
    const user = userEvent.setup();
    render(<BrandStep onSubmit={vi.fn()} onBack={vi.fn()} />);

    const input = screen.getByPlaceholderText(/transparencia, innovación/);
    await user.type(input, 'innovación{Enter}');

    expect(screen.getByText('innovación')).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('llama onSubmit con los valores al pulsar Continuar', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(
      <BrandStep
        onSubmit={onSubmit}
        onBack={vi.fn()}
        defaultValues={{
          target_audience: 'Audiencia de prueba',
          brand_story: 'Historia de marca de prueba',
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Continuar/ }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    const submitted = onSubmit.mock.calls[0]![0];
    expect(submitted.target_audience).toBe('Audiencia de prueba');
    expect(submitted.brand_story).toBe('Historia de marca de prueba');
  });

  it('invoca onBack cuando se pulsa el botón Atrás', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();

    render(<BrandStep onSubmit={vi.fn()} onBack={onBack} />);
    const backBtn = screen.getByRole('button', { name: /Atrás|Volver|Back/ });
    await user.click(backBtn);

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
