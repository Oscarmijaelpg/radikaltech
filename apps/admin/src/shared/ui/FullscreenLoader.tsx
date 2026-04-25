import { Spinner } from '@radikal/ui';

export function FullscreenLoader() {
  return (
    <div className="min-h-screen grid place-items-center bg-[hsl(var(--color-bg))]">
      <Spinner size="lg" />
    </div>
  );
}
