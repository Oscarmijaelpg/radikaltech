import { MemoryListTab } from './MemoryListTab';

export function CustomersTab({ projectId }: { projectId: string }) {
  return (
    <MemoryListTab
      projectId={projectId}
      category="customers"
      labels={{
        addButton: '+ Añadir segmento',
        dialogTitle: 'Nuevo segmento / buyer persona',
        nameLabel: 'Nombre del segmento',
        descriptionLabel: 'Descripción (buyer persona)',
        emptyTitle: 'Aún no has añadido segmentos de clientes',
        emptyDescription:
          'Conocer a tu audiencia es el primer paso. Describe a tus clientes ideales y adapto el contenido para cada uno.',
        icon: 'groups',
        character: 'kronos',
      }}
    />
  );
}
