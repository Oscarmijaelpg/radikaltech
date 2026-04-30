import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  FileUpload,
  Icon,
  Input,
  Skeleton,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@radikal/ui';
import { formatDate } from '@radikal/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { FeatureHint } from '@/shared/fte/FirstTimeExperience';
import {
  useMemories,
  useCreateMemory,
  useUpdateMemory,
  useDeleteMemory,
  type MemoryItem,
} from '../api/memory';
import {
  useAssets,
  useCreateAsset,
  useDeleteAsset,
  type ContentAsset,
} from '@/features/content/api/content';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { CharacterEmpty } from '@/shared/ui/CharacterEmpty';

interface Props {
  projectId: string;
}

function extractTitle(value: string): { title: string; body: string } {
  const match = value.match(/^\s*#\s+(.+)$/m);
  if (match && match[1]) {
    const title = match[1].trim();
    const body = value.replace(match[0], '').trim();
    return { title, body };
  }
  const firstLine = value.split('\n').find((l) => l.trim().length > 0) ?? 'Nota';
  return { title: firstLine.slice(0, 60), body: value };
}


function iconForMime(mime?: string): string {
  if (!mime) return 'description';
  if (mime.includes('pdf')) return 'picture_as_pdf';
  if (mime.includes('word') || mime.includes('document')) return 'description';
  return 'description';
}

function prettySize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function NeuronasTab({ projectId }: Props) {
  const confirmDialog = useConfirm();
  const [search, setSearch] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [editing, setEditing] = useState<MemoryItem | null>(null);
  const [draftText, setDraftText] = useState('');

  const notesQ = useMemories(projectId, 'note');
  const docsQ = useAssets(projectId, { type: 'document' });

  const createMemory = useCreateMemory();
  const updateMemory = useUpdateMemory();
  const deleteMemory = useDeleteMemory();

  const notes = useMemo(() => {
    const items = notesQ.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (n) => n.value.toLowerCase().includes(q) || (n.key ?? '').toLowerCase().includes(q),
    );
  }, [notesQ.data, search]);

  const docs = useMemo(() => {
    const items = docsQ.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((a) => {
      const meta = (a.metadata ?? {}) as Record<string, unknown>;
      const name =
        (typeof meta.original_name === 'string' ? meta.original_name : '') || a.asset_url;
      return name.toLowerCase().includes(q);
    });
  }, [docsQ.data, search]);

  const openNewNote = () => {
    setEditing(null);
    setDraftText('');
    setNoteOpen(true);
  };

  const openEditNote = (note: MemoryItem) => {
    setEditing(note);
    setDraftText(note.value);
    setNoteOpen(true);
  };

  const saveNote = async () => {
    const value = draftText.trim();
    if (!value) return;
    if (editing) {
      await updateMemory.mutateAsync({
        id: editing.id,
        project_id: projectId,
        value,
      });
    } else {
      await createMemory.mutateAsync({ project_id: projectId, category: 'note', value });
    }
    setNoteOpen(false);
    setDraftText('');
    setEditing(null);
  };

  const removeNote = async (n: MemoryItem) => {
    const ok = await confirmDialog({ title: '¿Eliminar esta nota?', variant: 'danger', confirmLabel: 'Eliminar' });
    if (!ok) return;
    await deleteMemory.mutateAsync({ id: n.id, project_id: projectId });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en notas y documentos..."
            className="pl-10"
          />
        </div>
      </div>

      <Tabs defaultValue="notes" className="w-full">
        <FeatureHint
          id="neuronas-notes-vs-docs"
          title="¿Notas o documentos?"
          description="Notas = ideas o resúmenes cortos que escribes tú. Documentos = archivos completos (briefs, manuales PDF) que la IA lee y cita."
        >
          <TabsList className="flex overflow-x-auto scrollbar-hide max-w-full flex-nowrap">
            <TabsTrigger value="notes" className="shrink-0">Recuerdos y notas</TabsTrigger>
            <TabsTrigger value="docs" className="shrink-0">Documentos de marca</TabsTrigger>
          </TabsList>
        </FeatureHint>

        <TabsContent value="notes">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h3 className="font-display text-base sm:text-lg font-bold">Recuerdos y notas</h3>
            <Button onClick={openNewNote}>
              <Icon name="add" className="text-[18px]" />
              Nueva nota
            </Button>
          </div>

          {notesQ.isLoading ? (
            <Skeleton className="h-48" />
          ) : notes.length === 0 ? (
            <Card className="p-6">
              <CharacterEmpty
                character="ankor"
                title="Aquí guardaremos tus ideas"
                message="Escríbelas sin miedo. Cada nota enriquece la memoria del proyecto y afina mis respuestas."
                action={{ label: 'Nueva nota', onClick: openNewNote }}
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {notes.map((n) => {
                const { title, body } = extractTitle(n.value);
                return (
                  <Card key={n.id} className="p-5 flex flex-col gap-3 hover:shadow-lg transition-shadow">
                    <div className="flex items-start gap-2">
                      <Icon name="note" className="text-violet-500" />
                      <h4 className="font-display font-bold text-slate-900 flex-1 truncate">
                        {title}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-3">{body.slice(0, 200)}</p>
                    <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">{formatDate(n.created_at)}</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => openEditNote(n)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                          aria-label="Editar"
                        >
                          <Icon name="edit" className="text-[18px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeNote(n)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                          aria-label="Eliminar"
                        >
                          <Icon name="delete" className="text-[18px]" />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="docs">
          <DocsSection projectId={projectId} docs={docs} loading={docsQ.isLoading} />
        </TabsContent>
      </Tabs>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="max-w-[100vw] sm:max-w-2xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[85vh] rounded-none sm:rounded-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar nota' : 'Nueva nota'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Empieza con <code className="bg-slate-100 px-1 rounded">#</code> para definir un título.
            </p>
            <Textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder="# Mi nota\n\nContenido..."
              rows={Math.min(20, Math.max(6, draftText.split('\n').length + 2))}
              className="min-h-[220px] font-mono text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setNoteOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => void saveNote()}
                disabled={!draftText.trim() || createMemory.isPending || updateMemory.isPending}
              >
                {(createMemory.isPending || updateMemory.isPending) && (
                  <Spinner className="h-4 w-4 mr-1" />
                )}
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface DocsSectionProps {
  projectId: string;
  docs: ContentAsset[];
  loading: boolean;
}

function DocsSection({ projectId, docs, loading }: DocsSectionProps) {
  const confirmDialog = useConfirm();
  const { user } = useAuth();
  const createAsset = useCreateAsset();
  const deleteAsset = useDeleteAsset();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function uploadFile(file: File): Promise<void> {
    if (!user) return;
    setUploading(true);
    setUploadError(null);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const id = crypto.randomUUID();
      const path = `${user.id}/${projectId}/${id}-${safeName}`;

      let publicUrl: string | null = null;
      // Try documents bucket first, fall back to assets
      const buckets: Array<'documents' | 'assets'> = ['documents', 'assets'];
      for (const bucket of buckets) {
        const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });
        if (!upErr) {
          const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
          publicUrl = pub.publicUrl;
          break;
        }
      }
      if (!publicUrl) {
        setUploadError('No se pudo subir el archivo.');
        return;
      }

      await createAsset.mutateAsync({
        project_id: projectId,
        asset_url: publicUrl,
        asset_type: 'document',
        metadata: {
          size: file.size,
          mime_type: file.type,
          original_name: file.name,
        },
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setUploading(false);
    }
  }

  const onFiles = (files: File[]) => {
    files.forEach((f) => void uploadFile(f));
  };

  const removeDoc = async (a: ContentAsset) => {
    const ok = await confirmDialog({ title: '¿Eliminar este documento?', variant: 'danger', confirmLabel: 'Eliminar' });
    if (!ok) return;
    await deleteAsset.mutateAsync({ id: a.id, project_id: projectId });
  };

  return (
    <div className="space-y-5">
      <FileUpload
        multiple
        accept=".pdf,.doc,.docx,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
        label="Arrastra documentos o haz click para subir"
        description="PDF, DOC, DOCX, TXT o MD."
        onFilesSelected={onFiles}
      />
      {uploading && (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Spinner className="h-4 w-4" /> Subiendo documento...
        </div>
      )}
      {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}

      {loading ? (
        <Skeleton className="h-40" />
      ) : docs.length === 0 ? (
        <Card className="p-6">
          <CharacterEmpty
            character="ankor"
            title="Sin documentos aún"
            message="Sube briefs, manuales de marca o guías y los consulto cada vez que necesitemos contexto profundo."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {docs.map((a) => {
            const meta = (a.metadata ?? {}) as Record<string, unknown>;
            const mime = typeof meta.mime_type === 'string' ? meta.mime_type : undefined;
            const name =
              (typeof meta.original_name === 'string' && meta.original_name) ||
              a.asset_url.split('/').pop() ||
              'Documento';
            const size = typeof meta.size === 'number' ? meta.size : undefined;
            return (
              <Card key={a.id} className="p-5 flex flex-col gap-3 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-3">
                  <Icon name={iconForMime(mime)} className="text-pink-500 text-[28px]" />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-display font-bold text-slate-900 truncate">{name}</h4>
                    <p className="text-[11px] text-slate-500">
                      {prettySize(size)} · {formatDate(a.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <a
                    href={a.asset_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:text-violet-800"
                  >
                    <Icon name="open_in_new" className="text-[16px]" />
                    Ver
                  </a>
                  <button
                    type="button"
                    onClick={() => void removeDoc(a)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                    aria-label="Eliminar"
                  >
                    <Icon name="delete" className="text-[18px]" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
