
import React, { useState, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useSaveMemory } from '../../hooks/useMemory';
import { useAuth } from '../../context/AuthContext';
import { useProjectContext } from '../../context/ProjectContext';
import { uploadImageFromBase64, uploadFile } from '../../../infrastructure/services/SupabaseStorageService';
import { callOpenRouter } from '../../../infrastructure/services/OpenRouterService';
import { extractTextFromPdf } from '../../utils/pdfExtractor';

interface AddKnowledgeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AddKnowledgeModal: React.FC<AddKnowledgeModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const { activeProject } = useProjectContext();
    const { mutateAsync: saveMemory } = useSaveMemory();
    const [isUploading, setIsUploading] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [uploadProgress, setUploadProgress] = useState<{ current: number, total: number }>({ current: 0, total: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length > 0) {
            setFiles(selectedFiles);
            
            // Generate previews for images
            const imageFiles = selectedFiles.filter(f => f.type.startsWith('image/'));
            if (imageFiles.length > 0) {
                const newPreviews: string[] = [];
                imageFiles.forEach(file => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        newPreviews.push(reader.result as string);
                        if (newPreviews.length === imageFiles.length) {
                            setPreviews(newPreviews);
                        }
                    };
                    reader.readAsDataURL(file);
                });
            } else {
                setPreviews([]);
            }
        }
    };

    const handleUpload = async () => {
        if (files.length === 0 || !user) return;
        if (!activeProject?.id) {
            alert('Selecciona un proyecto activo antes de añadir conocimiento.');
            return;
        }

        setIsUploading(true);
        setUploadProgress({ current: 0, total: files.length });
        
        try {
            for (let i = 0; i < files.length; i++) {
                const currentFile = files[i];
                setUploadProgress({ current: i + 1, total: files.length });
                

                let content = '';
                let resourceType: 'text' | 'image' | 'link' | 'document' | 'markdown' = 'document';
                let category = 'documentación';
                let imageUrl = '';

                if (currentFile.type.startsWith('image/')) {
                    resourceType = 'image';
                    category = 'analisis_imagenes';

                    const base64 = await fileToBase64(currentFile);

                    // 1. Try to upload to Storage
                    try {
                        const uploadedUrl = await uploadImageFromBase64(base64, `knowledge_${Date.now()}`);
                        imageUrl = uploadedUrl || base64;
                    } catch (e) {
                        console.warn('[AddKnowledge] Storage upload failed, using local base64 data');
                        imageUrl = base64;
                    }

                    // 2. Analyze Image
                    const analysis = await analyzeImage(base64);

                    imageUrl = imageUrl || (currentFile.type.startsWith('image/') ? base64 : '');

                } else if (currentFile.type === 'application/pdf') {
                    // 1. Upload to Storage
                    const fileUrl = await uploadFile(currentFile);
                    imageUrl = fileUrl || '';

                    // 2. PDF Text Extraction
                    setIsUploading(true); 
                    const extractedText = await extractTextFromPdf(currentFile);
                    content = `DOCUMENTO PDF: ${currentFile.name}\n\nCONTENIDO EXTRAÍDO:\n${extractedText}`;
                    resourceType = 'document';
                    category = 'neuronas';
                } else {
                    // 1. Upload to Storage
                    const fileUrl = await uploadFile(currentFile);
                    imageUrl = fileUrl || '';

                    content = `Archivo: ${currentFile.name}\nTipo: ${currentFile.type}\nTamaño: ${(currentFile.size / 1024).toFixed(2)} KB`;
                    resourceType = 'document';
                    category = 'neuronas';
                }

                // 3. Save to Memory
                await saveMemory({
                    user_id: user.id,
                    project_id: activeProject.id,
                    title: currentFile.name.split('.')[0],
                    content: content,
                    resource_type: resourceType,
                    summary: imageUrl,
                    memory_category: category,
                    user_confirmed: true
                });
            }

            onClose();
            // Reset state
            setFiles([]);
            setPreviews([]);
        } catch (error) {
            console.error('[AddKnowledge] Error adding knowledge:', error);
            alert('Hubo un problema al procesar los archivos. Revisa la consola para más detalles.');
        } finally {
            setIsUploading(false);
        }
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const analyzeImage = async (base64: string): Promise<string> => {
        const prompt = `Actúa como un Director de Arte y Experto en Identidad Visual. Analiza esta imagen extraída de una página web corporativa y responde siguiendo estrictamente esta estructura:

Etiqueta Inicial: Comienza con una ÚNICA palabra en mayúsculas que categorice la imagen (ej: PRODUCTO, LIFESTYLE, MARCA, ESPACIO, TEXTURA). Seguido de dos puntos.

Identificación del Sujeto: Inmediatamente después, nombra de manera explícita y directa el sujeto, plato o elemento principal que se ve en la imagen (ej: "Lasaña.", "Grupo de personas.", "Empaque genérico.", "Fachada de tienda."). Termina esto con un punto seguido.

Análisis Fotográfico y de Marca: Escribe un análisis técnico de entre 10 y máximo 100 palabras. NO te limites a describir el objeto físico. Enfócate en la dirección de arte: tipo de iluminación (suave, dura, natural), ángulo de cámara (cenital, picado, frontal), paleta de colores, encuadre, profundidad de campo, y qué valores de marca o atmósfera transmite esa composición fotográfica.

Ejemplo de salida esperada:
PRODUCTO: Lasaña de carne. Fotografía de estudio con ángulo picado e iluminación direccional cálida que resalta las texturas. El uso de un encuadre cerrado y un fondo neutro desenfocado (poca profundidad de campo) dirige la atención al centro, generando alto "appetite appeal". La dirección visual transmite una identidad de marca casera pero con estándares premium.`;

        try {
            return await callOpenRouter('openai/gpt-4o-mini', [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: base64 } }
                    ]
                }
            ]);
        } catch (e) {
            console.error('Error analyzing image:', e);
            return 'No se pudo realizar el análisis detallado. Imagen guardada correctamente.';
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Añadir nuevo conocimiento">
            <div className="space-y-6 w-full max-w-xl">
                <p className="text-sm text-slate-500 ">
                    Sube imágenes, documentos o reportes para que Radikal AI los procese y los guarde en tu ecosistema de marca.
                </p>

                <div className="space-y-4">
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className={`cursor-pointer border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all ${files.length > 0 ? 'border-[hsl(var(--color-primary))] bg-slate-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileChange}
                            accept="image/*,application/pdf,.doc,.docx"
                            multiple
                        />

                        {previews.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2 w-full max-h-48 overflow-y-auto p-2">
                                {previews.map((preview, idx) => (
                                    <div key={idx} className="relative group aspect-square">
                                        <img src={preview} className="w-full h-full object-cover rounded-lg shadow-sm" alt="Preview" />
                                    </div>
                                ))}
                                <div className="col-span-2 mt-2 text-center text-[10px] font-bold text-[hsl(var(--color-primary))] uppercase tracking-widest">
                                    {files.length} archivos seleccionados
                                </div>
                            </div>
                        ) : files.length > 0 ? (
                            <div className="text-center">
                                <span className="material-symbols-outlined text-4xl text-[hsl(var(--color-primary))] mb-2">description</span>
                                <p className="text-sm font-medium text-slate-600 ">{files.length} documentos seleccionados</p>
                                <p className="text-xs text-slate-400">Listo para procesar</p>
                            </div>
                        ) : (
                            <div className="text-center">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                                    <span className="material-symbols-outlined text-3xl text-slate-400">upload_file</span>
                                </div>
                                <p className="font-bold text-slate-700 ">Haz clic para subir archivos</p>
                                <p className="text-xs text-slate-400 mt-1">Puedes seleccionar varios archivos a la vez</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-3 pt-4">
                    <Button variant="ghost" className="w-full" onClick={onClose} disabled={isUploading}>Cancelar</Button>
                    <Button
                        className="w-full"
                        onClick={handleUpload}
                        disabled={files.length === 0 || isUploading}
                        isLoading={isUploading}
                    >
                        {isUploading ? `Procesando (${uploadProgress.current}/${uploadProgress.total})...` : 'Guardar en Memoria'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
