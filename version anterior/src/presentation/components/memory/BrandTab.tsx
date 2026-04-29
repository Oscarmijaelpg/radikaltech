import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { MemoryResource } from '../../../core/domain/entities';
import { renderFormattedBrandText } from '../../utils/memoryMarkdownUtils';
import { DynamicLoadingScreen } from '../ui/DynamicLoadingScreen';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useDeleteMemories, useSaveMemory } from '../../hooks/useMemory';
import { useAuth } from '../../context/AuthContext';
import { useProjectContext } from '../../context/ProjectContext';
import { uploadFile } from '../../../infrastructure/services/SupabaseStorageService';
import clsx from 'clsx';

interface BrandTabProps {
  filteredMemories: MemoryResource[];
  allMemories: MemoryResource[];
  onOpenMemory: (m: MemoryResource) => void;
}

export const BrandTab: React.FC<BrandTabProps> = ({ filteredMemories, allMemories, onOpenMemory }) => {
  const { user } = useAuth();
  const { activeProject } = useProjectContext();
  const { mutate: deleteMemories, isPending: isDeleting } = useDeleteMemories();
  const { mutateAsync: saveMemory } = useSaveMemory();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const logoContainerRef = React.useRef<HTMLDivElement>(null);

  const handleLogoEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingLogo(true);
    try {
      // 1. Upload to Storage
      const publicUrl = await uploadFile(file, 'brand-logos');
      if (!publicUrl) throw new Error('Upload failed');

      // 2. Find the primary Identity memory to update its JSON
      const identityMem = allMemories.find(m => 
        m.memory_category === 'identidad_marca' || 
        String(m.memory_category || '').toLowerCase() === 'mi marca'
      );

      if (identityMem) {
        try {
          let contentObj = JSON.parse(identityMem.content);
          if (Array.isArray(contentObj)) {
            contentObj[0].logo = publicUrl;
          } else {
            contentObj.logo = publicUrl;
          }
          
          await saveMemory({
            ...identityMem,
            content: JSON.stringify(contentObj)
          });
        } catch (err) {
          console.error('Error updating identity JSON:', err);
        }
      }

      // 3. Update or create the standalone 'logo' memory for consistency
      const existingLogoMem = allMemories.find(m => String(m.memory_category || '').toLowerCase() === 'logo');
      await saveMemory({
        id: existingLogoMem?.id,
        user_id: user.id,
        project_id: activeProject?.id || undefined,
        title: 'Logo de Marca',
        content: publicUrl,
        resource_type: 'text',
        memory_category: 'logo',
        user_confirmed: true
      });

    } catch (error) {
      console.error('Error changing logo:', error);
      alert('Error al actualizar el logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    deleteMemories({ memoryIds: selectedIds, userId: user?.id || '', projectId: activeProject?.id || null }, {
      onSuccess: () => {
        setIsModalOpen(false);
        setSelectedIds([]);
      }
    });
  };

  if (filteredMemories.length === 0) {
    return (
      <DynamicLoadingScreen 
        title="Construyendo tu Identidad de Marca" 
        subtitle="Kronos está procesando la información de tu marca, analizando su esencia, ventaja competitiva y elementos visuales para generar un perfil completo."
      />
    );
  }

  // Helper to extract hex colors from memory
  const getBrandColors = () => {
    const chromaticMemories = filteredMemories.filter(m => (m as any).subTitle === 'Sistema Cromático');
    const chromaticMemory = [...chromaticMemories].reverse()[0];
    if (!chromaticMemory) return null;

    let contentStr = '';
    let brandHexes: string[] = [];

    // Try to handle both JSON and plain string content
    try {
      const data = typeof chromaticMemory.content === 'object' ? chromaticMemory.content : JSON.parse(chromaticMemory.content);
      if (data && data.colores_acento_marca) {
        brandHexes = Array.isArray(data.colores_acento_marca) ? data.colores_acento_marca : [data.colores_acento_marca];
      }
    } catch (e) {
      contentStr = chromaticMemory.content;
      const hexRegex = /#([0-9A-Fa-f]{3,6})/g;
      const allMatches = (contentStr.match(hexRegex) || []) as string[];
      brandHexes = allMatches.filter(color => {
        const low = color.toLowerCase();
        const neutrals = ['#ffffff', '#000000', '#fff', '#000', '#111111', '#222222', '#eeeeee', '#f1f1f1', '#fcfcfc', '#fafafa', '#cccccc'];
        return !neutrals.includes(low);
      });
    }

    if (brandHexes.length >= 2) {
      return { primary: brandHexes[0], secondary: brandHexes[1] };
    } else if (brandHexes.length === 1) {
      return { primary: brandHexes[0], secondary: brandHexes[0] };
    }
    return null;
  };

  const brandColors = getBrandColors();
  const identityCardStyle = brandColors ? {
    background: `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.secondary})`,
    boxShadow: `0 20px 40px -15px ${brandColors.primary}40`
  } : {};

  return (
    <>
      <section>
        <div className="flex items-center gap-3 mb-6">
          <span className="w-8 h-8 rounded-lg bg-[hsl(var(--color-primary)/0.1)] flex items-center justify-center text-[hsl(var(--color-primary))] font-bold text-lg">1</span>
          <h2 className="text-xl font-bold text-slate-800 uppercase tracking-widest text-sm">Identidad Central</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {filteredMemories.filter(m => (m as any).subTitle === 'Identidad y Esencia').map(m => (
            <Card
              key={m.id}
              onClick={(e: React.MouseEvent) => {
                if (logoContainerRef.current?.contains(e.target as Node)) return;
                onOpenMemory(m);
              }}
              style={identityCardStyle}
              className={`lg:col-span-8 ${!brandColors ? 'bg-gradient-to-br from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] shadow-primary/20' : ''} text-white border-none p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 min-h-[250px] md:min-h-[300px] cursor-pointer hover:scale-[1.01] transition-all shadow-xl`}
            >
              <div ref={logoContainerRef} className="relative group/logo w-24 h-24 md:w-40 md:h-40 bg-white/20 backdrop-blur-md rounded-2xl md:rounded-3xl flex items-center justify-center shrink-0 border border-white/30 shadow-inner mx-auto md:mx-0 overflow-hidden">
                {(m as any).logo_url ? (
                  <img src={(m as any).logo_url} alt="Logo" className="w-full h-full object-contain p-4" />
                ) : (
                  <span className="material-symbols-outlined text-5xl md:text-7xl text-white font-thin">pentagon</span>
                )}

                {/* Edit Overlay */}
                <div
                  className={clsx(
                    "absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity cursor-pointer z-10",
                    isUploadingLogo ? "opacity-100" : "opacity-0 group-hover/logo:opacity-100"
                  )}
                  onClick={handleLogoEdit}
                >
                  {isUploadingLogo ? (
                    <span className="material-symbols-outlined text-white animate-spin">progress_activity</span>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                       <span className="material-symbols-outlined text-white text-3xl">edit</span>
                       <span className="text-[10px] font-black uppercase tracking-widest text-white">Cambiar Logo</span>
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleLogoChange}
                />
              </div>
              <div className="flex flex-col justify-center">
                <h4 className="text-white/60 uppercase text-[10px] font-bold tracking-[0.3em] mb-2">Esencia de Marca</h4>
                <h3 className="text-3xl font-black mb-4 leading-tight">{(m as any).subTitle || (m as any).title}</h3>
                <div className={clsx("text-lg leading-relaxed line-clamp-6 font-medium italic", brandColors?.primary === '#ffffff' ? "text-slate-800" : "text-white/80")}>
                  {renderFormattedBrandText(m.content, brandColors?.primary === '#ffffff' ? "text-slate-800" : "text-white/90")}
                </div>
              </div>
            </Card>
          ))}
          <div className="lg:col-span-4 grid grid-cols-1 gap-6">
            {filteredMemories.filter(m => ['Ventaja Competitiva', 'Tono de Comunicación'].includes((m as any).subTitle || '')).map(m => (
              <Card
                key={m.id}
                onClick={() => onOpenMemory(m)}
                className="bg-white border-slate-200 p-6 cursor-pointer hover:border-[hsl(var(--color-primary))] transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="material-symbols-outlined text-[hsl(var(--color-primary))] group-hover:scale-110 transition-transform">
                    {(m as any).subTitle === 'Ventaja Competitiva' ? 'military_tech' : 'record_voice_over'}
                  </span>
                  <h3 className="font-bold text-slate-900 ">{(m as any).subTitle}</h3>
                </div>
                <div className="text-sm text-slate-500 line-clamp-5 leading-relaxed">
                  {renderFormattedBrandText(m.content, undefined, true)}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-8 h-8 rounded-lg bg-[hsl(var(--color-primary)/0.1)] flex items-center justify-center text-[hsl(var(--color-primary))] font-bold text-lg">2</span>
          <h2 className="text-xl font-bold text-slate-800 uppercase tracking-widest text-sm">Dirección Creativa</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredMemories.filter(m => ['Sistema Cromático', 'Dirección Visual', 'Portafolio de Productos', 'Audiencia'].includes((m as any).subTitle || '')).map(m => (
            <Card
              key={m.id}
              onClick={() => onOpenMemory(m)}
              className="p-6 bg-slate-50 border-slate-200 cursor-pointer hover:bg-white transition-all hover:shadow-lg"
            >
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-4 shadow-sm">
                <span className="material-symbols-outlined text-[hsl(var(--color-primary))]">
                  {(m as any).subTitle === 'Sistema Cromático' ? 'palette' :
                    (m as any).subTitle === 'Dirección Visual' ? 'auto_awesome_motion' :
                      (m as any).subTitle === 'Portafolio de Productos' ? 'inventory_2' : 'groups'}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{(m as any).subTitle}</h3>
              <div className="text-xs text-slate-500 leading-relaxed">
                {(m as any).subTitle === 'Sistema Cromático' ? (
                  (() => {
                    try {
                      const data = typeof m.content === 'object' ? m.content : JSON.parse(m.content);
                      const neutros = data.colores_neutros_funcionales || [];
                      const marca = data.colores_acento_marca || [];
                      const analisis = data.analisis || '';

                      return (
                        <div className="space-y-4">
                          <div className="flex flex-wrap gap-2">
                             {marca.map((c: string) => (
                               <div key={c} className="group relative">
                                 <div className="w-8 h-8 rounded-full border border-slate-200 shadow-sm transition-transform hover:scale-110" style={{ backgroundColor: c }} />
                                 <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] opacity-0 group-hover:opacity-100 transition-opacity font-bold uppercase">{c}</span>
                               </div>
                             ))}
                             <div className="w-px h-8 bg-slate-200 mx-1" />
                             {neutros.map((c: string) => (
                               <div key={c} className="group relative">
                                 <div className="w-8 h-8 rounded-full border border-slate-200 shadow-sm transition-transform hover:scale-110" style={{ backgroundColor: c }} />
                                 <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] opacity-0 group-hover:opacity-100 transition-opacity font-bold uppercase">{c}</span>
                               </div>
                             ))}
                          </div>
                          <p className="line-clamp-4 italic text-slate-400 mt-2">{analisis}</p>
                        </div>
                      );
                    } catch (e) {
                      return <span className="line-clamp-6">{renderFormattedBrandText(m.content, undefined, true)}</span>;
                    }
                  })()
                ) : (
                  <span className="line-clamp-6">{renderFormattedBrandText(m.content, undefined, true)}</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-8 h-8 rounded-lg bg-[hsl(var(--color-primary)/0.1)] flex items-center justify-center text-[hsl(var(--color-primary))] font-bold text-lg">3</span>
          <h2 className="text-xl font-bold text-slate-800 uppercase tracking-widest text-sm">Presencia y Conectividad</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMemories.filter(m =>
            ['Ubicaciones', 'Canales de Contacto'].includes((m as any).subTitle || '') ||
            /instagram/i.test(m.memory_category || '')
          ).map(m => (
            <Card
              key={m.id}
              onClick={() => onOpenMemory(m)}
              className="p-6 bg-slate-50 border-slate-200 cursor-pointer hover:bg-white transition-all hover:shadow-lg"
            >
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-4 shadow-sm">
                <span className="material-symbols-outlined text-[hsl(var(--color-primary))]">
                  {/instagram/i.test(m.memory_category || '') ? 'photo_camera' :
                    (m as any).subTitle === 'Ubicaciones' ? 'location_on' : 'hub'}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 mb-2">
                {/instagram/i.test(m.memory_category || '') ? 'Audiencia Instagram' : (m as any).subTitle || 'Conectividad'}
              </h3>
              <div className="text-xs text-slate-500 line-clamp-6 leading-relaxed">
                {renderFormattedBrandText(m.content, undefined, true)}
              </div>
            </Card>
          ))}
          {filteredMemories.filter(m => (m as any).subTitle === 'Oportunidades').map(m => (
            <Card
              key={m.id}
              onClick={() => onOpenMemory(m)}
              className="p-6 bg-gradient-to-br from-slate-800 to-black text-white border-none cursor-pointer hover:scale-[1.02] transition-all shadow-xl"
            >
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-4 border border-white/20">
                <span className="material-symbols-outlined text-white">lightbulb</span>
              </div>
              <h3 className="font-bold text-white mb-2">{(m as any).subTitle}</h3>
              <div className="text-xs text-white line-clamp-6 leading-relaxed">
                {renderFormattedBrandText(m.content, "text-white/80", true)}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-12 pb-24">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-[hsl(var(--color-primary)/0.1)] flex items-center justify-center text-[hsl(var(--color-primary))] font-bold text-lg">4</span>
            <h2 className="text-xl font-bold text-slate-800 uppercase tracking-widest text-sm">Biblioteca de Imagenes - Mi Marca</h2>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-4 animate-in slide-in-from-right-4 duration-300">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                {selectedIds.length} {selectedIds.length === 1 ? 'seleccionada' : 'seleccionadas'}
              </span>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedIds([])}
                  className="h-9 px-4 rounded-xl text-[10px] font-black tracking-widest uppercase"
                >
                  Cancelar
                </Button>
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={() => setIsModalOpen(true)}
                  className="h-9 px-4 rounded-xl bg-red-500 hover:bg-red-600 border-red-500 hover:border-red-600 text-[10px] font-black tracking-widest uppercase flex items-center gap-2 shadow-lg shadow-red-500/20"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                  Eliminar
                </Button>
              </div>
            </div>
          )}
        </div>

        {(() => {
          const RESTRICTED_DOMAINS = ['pixel.wp.com', 'gravatar.com', 'doubleclick.net', 'analytics'];

          const brandImages = filteredMemories.filter(m =>
            (m.memory_category === 'analisis_imagenes') &&
            !(m as any).isSubSection &&
            !(m.title && m.title.startsWith('Contrato Visual:')) // EXCLUDE Nexo results
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
            return { ...m, displayUrl: url };
          }).filter(m => {
            if (!m.displayUrl || !m.displayUrl.startsWith('http')) return false;
            const lowUrl = m.displayUrl.toLowerCase();

            // EXCLUDE SVGs as instructed
            if (lowUrl.endsWith('.svg')) return false;

            const isRestricted = RESTRICTED_DOMAINS.some(domain => lowUrl.includes(domain));
            if (isRestricted) {
              console.warn(`[ContentIdeation] Filtering restricted asset: ${m.displayUrl}`);
              return false;
            }
            return true;
          });

          if (brandImages.length === 0) {
            return (
              <div className="p-12 border-2 border-dashed border-slate-200 rounded-[2.5rem] text-center">
                <span className="material-symbols-outlined text-slate-300 text-5xl mb-4">image_search</span>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">No hay imágenes de marca registradas aún</p>
              </div>
            );
          }

          return (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {brandImages.map(img => {
                const isSelected = selectedIds.includes(img.id);
                return (
                  <div
                    key={img.id}
                    onClick={() => {
                        if (selectedIds.length > 0) {
                            setSelectedIds(prev => isSelected ? prev.filter(i => i !== img.id) : [...prev, img.id]);
                        } else {
                            onOpenMemory(img);
                        }
                    }}
                    className={clsx(
                        "group relative aspect-square rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer shadow-sm",
                        isSelected ? "border-[hsl(var(--color-primary))] ring-4 ring-[hsl(var(--color-primary)/0.1)] scale-95" : "border-slate-200 hover:shadow-xl hover:scale-[1.02]"
                    )}
                  >
                    <img
                      src={img.displayUrl}
                      className={clsx(
                          "w-full h-full object-cover transition-transform duration-700",
                          isSelected ? "scale-110 brightness-75" : "group-hover:scale-110"
                      )}
                    />
                    
                    {/* Selection Toggle Bubble */}
                    <div 
                      onClick={(e) => toggleSelect(img.id, e)}
                      className={clsx(
                        "absolute top-3 right-3 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all z-10",
                        isSelected 
                          ? "bg-[hsl(var(--color-primary))] border-white shadow-lg scale-110" 
                          : "bg-black/20 border-white/40 backdrop-blur-md opacity-0 group-hover:opacity-100 hover:scale-110 hover:bg-black/40"
                      )}
                    >
                      {isSelected && (
                        <span className="material-symbols-outlined text-white text-lg font-bold">check</span>
                      )}
                    </div>

                    <div className={clsx(
                        "absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center",
                        isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}>
                      {!isSelected && (
                        <span className="px-3 py-1.5 bg-white text-black text-[9px] font-black uppercase tracking-widest rounded-lg">ABRIR</span>
                      )}
                      {isSelected && (
                        <span className="px-3 py-1.5 bg-white text-[hsl(var(--color-primary))] text-[9px] font-black uppercase tracking-widest rounded-lg">SELECCIONADO</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </section>

      {/* Confirmation Modal for Bulk Delete */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Eliminar imágenes"
        maxWidth="md"
      >
        <div className="p-2 space-y-6">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-2">
              <span className="material-symbols-outlined text-3xl">delete_sweep</span>
            </div>
            <h3 className="text-xl font-bold text-slate-800">¿Estás seguro?</h3>
            <p className="text-slate-600 text-sm">
              Esta acción eliminará permanentemente <span className="font-bold text-slate-900">{selectedIds.length}</span> imágenes de tu biblioteca de marca. Esta acción no se puede deshacer.
            </p>
          </div>

          <div className="flex gap-4 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              className="flex-1 rounded-xl h-12"
              onClick={() => setIsModalOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              className="flex-1 bg-red-500 hover:bg-red-600 border-red-500 hover:border-red-600 rounded-xl h-12"
              onClick={handleBulkDelete}
              isLoading={isDeleting}
            >
              Eliminar {selectedIds.length} imágenes
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
