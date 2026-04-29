import { Button, Spinner } from '@radikal/ui';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface NavButtonsProps {
  onBack?: () => void;
  onNext?: () => void;
  backLabel?: string;
  nextLabel?: string;
  nextDisabled?: boolean;
  loading?: boolean;
  hideBack?: boolean;
  nextType?: 'submit' | 'button';
}

export function NavButtons({
  onBack,
  onNext,
  backLabel = 'Atrás',
  nextLabel = 'Siguiente',
  nextDisabled,
  loading,
  hideBack,
  nextType = 'button',
}: NavButtonsProps) {
  return (
    <div className="flex items-center justify-between gap-3 pt-6 sm:pt-8 mt-6 sm:mt-8 border-t border-[hsl(var(--color-border))]">
      {!hideBack ? (
        <Button type="button" variant="ghost" onClick={onBack} disabled={loading}>
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Button>
      ) : (
        <span />
      )}
      <Button
        type={nextType}
        variant="primary"
        onClick={onNext}
        disabled={nextDisabled || loading}
      >
        {loading ? <Spinner size="sm" className="border-white border-t-white/40" /> : null}
        {nextLabel}
        {!loading && <ArrowRight className="h-4 w-4" />}
      </Button>
    </div>
  );
}
