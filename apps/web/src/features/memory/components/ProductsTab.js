import { jsx as _jsx } from "react/jsx-runtime";
import { MemoryListTab } from './MemoryListTab';
export function ProductsTab({ projectId }) {
    return (_jsx(MemoryListTab, { projectId: projectId, category: "products", labels: {
            addButton: '+ Añadir producto',
            dialogTitle: 'Nuevo producto',
            nameLabel: 'Nombre del producto',
            descriptionLabel: 'Descripción',
            emptyTitle: 'Aún no has añadido productos',
            emptyDescription: 'Cuéntame qué ofreces y te ayudo a posicionarlo. Describe los productos o servicios principales para que los tenga en cuenta.',
            icon: 'inventory_2',
            character: 'indexa',
        } }));
}
