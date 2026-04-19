import type { ReactNode } from 'react';
import { Card, Spinner } from '@radikal/ui';

interface Props {
  children: ReactNode;
}

export function BusyOverlay({ children }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
      <Card className="p-8 max-w-sm text-center space-y-4">
        <div className="flex justify-center">
          <Spinner />
        </div>
        <div className="text-sm text-slate-700">{children}</div>
      </Card>
    </div>
  );
}
