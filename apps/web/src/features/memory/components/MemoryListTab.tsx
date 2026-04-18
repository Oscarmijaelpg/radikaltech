import { useState } from 'react';
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Icon,
  Input,
  Skeleton,
  Spinner,
  Textarea,
} from '@radikal/ui';
import { CharacterEmpty, type CharacterKey } from '@/shared/ui/CharacterEmpty';
import {
  useCreateMemory,
  useDeleteMemory,
  useMemories,
  useUpdateMemory,
  type MemoryItem,
} from '../api/memory';

interface Labels {
  addButton: string;
  dialogTitle: string;
  nameLabel: string;
  descriptionLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  icon: string;
  character?: CharacterKey;
}

interface Props {
  projectId: string;
  category: string;
  labels: Labels;
}

export function MemoryListTab({ projectId, category, labels }: Props) {
  const { data: items, isLoading } = useMemories(projectId, category);
  const create = useCreateMemory();
  const update = useUpdateMemory();
  const remove = useDeleteMemory();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MemoryItem | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setOpen(true);
  };

  const openEdit = (item: MemoryItem) => {
    setEditing(item);
    setName(item.key ?? '');
    setDescription(item.value);
    setOpen(true);
  };

  const onSave = async () => {
    if (!description.trim()) return;
    if (editing) {
      await update.mutateAsync({
        id: editing.id,
        project_id: projectId,
        key: name,
        value: description,
      });
    } else {
      await create.mutateAsync({
        project_id: projectId,
        category,
        key: name,
        value: description,
      });
    }
    setOpen(false);
  };

  const onDelete = async (id: string) => {
    await remove.mutateAsync({ id, project_id: projectId });
  };

  if (isLoading) {
    return <Skeleton className="h-48" />;
  }

  const saving = create.isPending || update.isPending;

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Icon name="add" className="text-[18px]" />
          {labels.addButton}
        </Button>
      </div>

      {!items || items.length === 0 ? (
        <Card className="p-6">
          <CharacterEmpty
            character={labels.character ?? 'ankor'}
            title={labels.emptyTitle}
            message={labels.emptyDescription}
            action={{ label: labels.addButton, onClick: openCreate }}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <Card key={item.id} className="p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-display font-bold text-lg text-slate-900">
                  {item.key || 'Sin título'}
                </h3>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(item)} aria-label="Editar">
                    <Icon name="edit" className="text-[18px]" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(item.id)}
                    aria-label="Eliminar"
                  >
                    <Icon name="delete" className="text-[18px]" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{item.value}</p>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[100vw] sm:max-w-lg h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[85vh] rounded-none sm:rounded-lg">
          <DialogHeader>
            <DialogTitle>{editing ? `Editar: ${editing.key || ''}` : labels.dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              label={labels.nameLabel}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Textarea
              label={labels.descriptionLabel}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={onSave} disabled={saving || !description.trim()}>
              {saving ? <Spinner /> : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
