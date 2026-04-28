import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Icon,
  Input,
  Spinner,
} from '@radikal/ui';
import { useEditImage, type EditImageResult } from '../api/content';
import { useChargeConfirm } from '@/features/credits/hooks/useChargeConfirm';

const QUICK_CHIPS = [
  'Más brillante',
  'Más minimalista',
  'Cambia fondo a blanco',
  'Más dramático',
  'Más colorido',
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceUrl: string;
  sourceAssetId: string;
  projectId?: string;
  onUseNew?: (result: EditImageResult) => void;
}

export function ImageEditDialog({
  open,
  onOpenChange,
  sourceUrl,
  sourceAssetId,
  projectId,
  onUseNew,
}: Props) {
  const [instruction, setInstruction] = useState('');
  const [result, setResult] = useState<EditImageResult | null>(null);
  const edit = useEditImage();
  const confirmCharge = useChargeConfirm();

  useEffect(() => {
    if (!open) {
      setInstruction('');
      setResult(null);
      edit.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onGenerate = async () => {
    const text = instruction.trim();
    if (text.length < 3) return;
    const ok = await confirmCharge('image.edit', { detail: 'Vas a generar una iteración de la imagen.' });
    if (!ok) return;
    try {
      const r = await edit.mutateAsync({
        source_asset_id: sourceAssetId,
        edit_instruction: text,
        project_id: projectId,
      });
      setResult(r);
    } catch {
      /* handled via edit.error */
    }
  };

  const loading = edit.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl sm:max-h-[90vh] overflow-auto">
        <DialogTitle>Iterar imagen con Nexo</DialogTitle>
        <DialogDescription>
          Describe el cambio que quieres. Nexo editará manteniendo el branding.
        </DialogDescription>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-tighter opacity-60 mb-2">
              Original
            </p>
            <div className="rounded-2xl overflow-hidden bg-slate-100 relative">
              <img
                src={sourceUrl}
                alt="source"
                className="w-full h-auto object-contain max-h-[420px]"
              />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-tighter opacity-60 mb-2">
              Resultado
            </p>
            <div className="rounded-2xl overflow-hidden bg-slate-100 min-h-[260px] relative grid place-items-center">
              {loading ? (
                <div className="flex flex-col items-center gap-2 p-6 text-center">
                  <Spinner size="lg" />
                  <p className="text-sm font-semibold text-slate-700">
                    Nexo está editando...
                  </p>
                </div>
              ) : result ? (
                <img
                  src={result.url}
                  alt="edited"
                  className="w-full h-auto object-contain max-h-[420px]"
                />
              ) : (
                <p className="text-xs text-slate-500 p-6 text-center">
                  La imagen editada aparecerá aquí.
                </p>
              )}
            </div>
            {result && (
              <div className="mt-2 flex gap-2 flex-wrap">
                <Badge variant="muted">Generado por Nexo</Badge>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-[10px] font-black uppercase tracking-tighter mb-2 opacity-60">
            ¿Qué cambio quieres?
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {QUICK_CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setInstruction(c)}
                className="px-3 py-2 rounded-full text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 min-h-[44px] sm:min-h-0 sm:py-1.5"
              >
                {c}
              </button>
            ))}
          </div>
          <Input
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Ej. Cambia el fondo a azul cielo, estilo minimalista..."
            disabled={loading}
          />
        </div>

        {edit.isError && (
          <p className="mt-3 text-xs text-red-700 bg-red-50 px-3 py-1.5 rounded-lg">
            Error editando. Intenta de nuevo.
          </p>
        )}

        <div className="mt-5 flex gap-2 justify-end flex-wrap [&>button]:min-h-[44px]">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cerrar
          </Button>
          {result ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setResult(null);
                  setInstruction('');
                }}
                disabled={loading}
              >
                Descartar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setResult(null);
                }}
                disabled={loading}
              >
                <Icon name="tune" className="text-[18px]" />
                Iterar otra vez
              </Button>
              <Button
                onClick={() => {
                  onUseNew?.(result);
                  onOpenChange(false);
                }}
              >
                Usar esta nueva
              </Button>
            </>
          ) : (
            <Button
              onClick={() => void onGenerate()}
              disabled={instruction.trim().length < 3 || loading}
            >
              <Icon name="auto_awesome" className="text-[18px]" />
              Generar iteración
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
