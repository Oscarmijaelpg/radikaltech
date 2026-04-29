import React from 'react';
import { Card } from '../ui/Card';
import { MemoryResource } from '../../../core/domain/entities';
import { format } from 'date-fns';
import { renderFormattedBrandText, getMemoryIcon } from '../../utils/memoryMarkdownUtils';

interface NeuronasTabProps {
  filteredMemories: MemoryResource[];
  onOpenMemory: (m: MemoryResource) => void;
  onDeleteMemory: (m: MemoryResource) => void;
}

export const NeuronasTab: React.FC<NeuronasTabProps> = ({ filteredMemories, onOpenMemory, onDeleteMemory }) => {
  return (
    <>
      <section>
        <div className="flex items-center gap-3 mb-8">
          <span className="w-8 h-8 rounded-lg bg-[hsl(var(--color-primary)/0.1)] flex items-center justify-center text-[hsl(var(--color-primary))] font-bold text-lg">1</span>
          <h2 className="text-xl font-bold text-slate-800 uppercase tracking-widest text-sm">Mis Archivos</h2>
        </div>

        {/* Memorias Sub-section */}
        <div className="mb-10">
          <h3 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-[hsl(var(--color-primary))]">psychology</span>
            Recuerdos y Notas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredMemories.filter(m => !([
              'Identidad y Esencia', 'Ventaja Competitiva', 'Tono de Comunicación',
              'Sistema Cromático', 'Dirección Visual', 'Portafolio de Productos', 'Audiencia',
              'Ubicaciones', 'Canales de Contacto', 'Oportunidades'
            ].includes((m as any).subTitle || '')) &&
              m.memory_category !== 'analisis_imagenes' &&
              !/instagram/i.test(m.memory_category || '') &&
              String(m.memory_category || '').toLowerCase() !== 'logo' &&
              m.resource_type === 'text' &&
              m.user_confirmed
            ).map(m => (
              <Card
                key={m.id}
                onClick={() => onOpenMemory(m)}
                className="relative p-6 bg-white border-slate-200 cursor-pointer hover:shadow-lg hover:border-[hsl(var(--color-primary)/0.4)] transition-all group"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteMemory(m);
                  }}
                  className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 z-10"
                  title="Eliminar memoria"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>

                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-[hsl(var(--color-primary)/0.1)] transition-colors">
                    <span className="material-symbols-outlined text-[hsl(var(--color-primary))]">
                      {getMemoryIcon(m)}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 line-clamp-1 pr-6">{(m as any).subTitle || m.title}</h3>
                </div>
                <div className="text-xs text-slate-500 line-clamp-6 leading-relaxed">
                  {renderFormattedBrandText(m.content, undefined, true)}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="uppercase font-bold tracking-wider line-clamp-1">{m.memory_category || m.resource_type}</span>
                  <span>{m.created_at ? format(new Date(m.created_at), 'dd/MM/yyyy') : ''}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Documentos Sub-section */}
        <div className="mb-10 mt-12">
          <h3 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-[hsl(var(--color-primary))]">description</span>
            Documentos de Marca
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredMemories.filter(m => 
              m.resource_type === 'document' && 
              m.user_confirmed
            ).map(m => (
              <Card
                key={m.id}
                onClick={() => onOpenMemory(m)}
                className="relative p-6 bg-white border-slate-200 cursor-pointer hover:shadow-lg hover:border-[hsl(var(--color-primary)/0.4)] transition-all group overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-[hsl(var(--color-primary))] opacity-20"></div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteMemory(m);
                  }}
                  className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 z-10"
                  title="Eliminar documento"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-[hsl(var(--color-primary)/0.1)] transition-colors shrink-0">
                    <span className="material-symbols-outlined text-[hsl(var(--color-primary))] text-2xl">
                      {m.title.toLowerCase().endsWith('.pdf') ? 'picture_as_pdf' : 
                       m.title.toLowerCase().endsWith('.doc') || m.title.toLowerCase().endsWith('.docx') ? 'description' : 
                       m.title.toLowerCase().endsWith('.ppt') || m.title.toLowerCase().endsWith('.pptx') ? 'present_to_all' : 'draft'}
                    </span>
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-slate-900 line-clamp-1 pr-6" title={m.title}>{m.title}</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Documento</p>
                  </div>
                </div>
                
                <div className="text-[11px] text-slate-500 line-clamp-4 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100 italic">
                  {m.content.length > 20 ? (m.content.substring(0, 150) + (m.content.length > 150 ? '...' : '')) : 'Documento cargado correctamente.'}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="uppercase font-bold tracking-wider">{m.memory_category || 'Archivo'}</span>
                  <span>{m.created_at ? format(new Date(m.created_at), 'dd/MM/yyyy') : ''}</span>
                </div>
              </Card>
            ))}
            {filteredMemories.filter(m => m.resource_type === 'document' && m.user_confirmed).length === 0 && (
              <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[32px] opacity-40">
                <span className="material-symbols-outlined text-4xl mb-2">upload_file</span>
                <p className="text-sm font-bold">Aún no hay documentos subidos</p>
              </div>
            )}
          </div>
        </div>

        {/* Imágenes Sub-section - ALL images appear here (History) */}
        <div className="mt-12">
          <h3 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-[hsl(var(--color-primary))]">image</span>
            Archivo de Imágenes
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {filteredMemories.filter(m =>
              (m.memory_category === 'analisis_imagenes' || m.memory_category === 'infografia_analisis' || m.resource_type === 'image' || m.resource_type === 'analisis_imagenes') &&
              !(m as any).isSubSection
            ).map(m => {
              let url = m.summary || '';
              if (!url) {
                try {
                  const data = JSON.parse(m.content);
                  url = data.url || data.imageUrl || data.link || m.content;
                } catch (e) {
                  if (m.content.startsWith('http')) url = m.content;
                }
              }
              if (!url || !url.startsWith('http')) return null;

              return (
                <Card
                  key={m.id}
                  onClick={() => onOpenMemory(m)}
                  className="relative aspect-square cursor-pointer hover:border-[hsl(var(--color-primary)/0.5)] transition-all group overflow-hidden p-0 border-slate-200"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteMemory(m);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-black/20 text-white hover:bg-red-500 backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100 z-10"
                    title="Eliminar imagen"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>

                  <img src={url} alt={m.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <p className="text-[9px] font-bold text-white truncate uppercase tracking-tighter">{m.title || 'Análisis'}</p>
                    <p className="text-[7px] text-white/70 uppercase tracking-widest">{m.memory_category || m.resource_type}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
};
