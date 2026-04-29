import React, { useState, useEffect } from 'react';
import { MemoryResource } from '../../../core/domain/entities';
import { callOpenRouter } from '../../../infrastructure/services/OpenRouterService';
import { generateImage } from '../../../infrastructure/services/ImageGenerationService';
import { useSaveMemory, useDeleteMemory } from '../../hooks/useMemory';
import clsx from 'clsx';
import { Button } from '../ui/Button';
import { useWallet } from '../../hooks/useTokens';
import { NavLink } from 'react-router-dom';
import { ImageOverlay } from '../ui/ImageOverlay';
import { uploadImageFromBase64 } from '../../../infrastructure/services/SupabaseStorageService';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../hooks/useChat';
import { useObjectives } from '../../hooks/useObjectives';
import { InsufficientTokensModal } from '../ui/InsufficientTokensModal';
import { SupabaseTokenRepository } from '../../../infrastructure/repositories/SupabaseTokenRepository';
import { supabase } from '../../../infrastructure/supabase/client';
import { PRICING_TR } from '../../../core/domain/constants/pricing';
import { useRef } from 'react';

const tokenRepository = new SupabaseTokenRepository(supabase);

interface ContentIdea {
    title: string;
    description: string; // Qué y Por qué (Estrategia)
    platform: string;
    visual_suggestion: string;
    type: 'pilar' | 'carrusel';
    image_count: number;
    suggested_assets?: string[]; // Titles or keywords of assets to pre-select
    source_title?: string; // Title of the source news/competition analysis
}

interface ContentIdeationProps {
    competitionData: MemoryResource[];
    brandData: MemoryResource[];
    newsData: MemoryResource[];
    competitionInfographics?: MemoryResource[];
    newsInfographics?: MemoryResource[];
    userId: string;
    activeProjectId: string;
    useAutomated?: boolean;
    useManual?: boolean;
}

export const ContentIdeation: React.FC<ContentIdeationProps> = ({
    competitionData,
    brandData,
    newsData,
    competitionInfographics = [],
    newsInfographics = [],
    userId,
    activeProjectId,
    useAutomated = true,
    useManual = true
}) => {
    const { data: wallet } = useWallet();
    const [ideas, setIdeas] = useState<ContentIdea[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isThinkingImage, setIsThinkingImage] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'start' | 'ideas' | 'refine'>('start');
    const [selectedIdea, setSelectedIdea] = useState<ContentIdea | null>(null);
    const [availableAssets, setAvailableAssets] = useState<string[]>([]);
    const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
    
    // NEW: Brand Logo Selection States
    const [wantsLogo, setWantsLogo] = useState(false);
    const [selectedLogoUrl, setSelectedLogoUrl] = useState<string | null>(null);
    const [availableLogos, setAvailableLogos] = useState<string[]>([]);

    const [customImageUrl, setCustomImageUrl] = useState('');
    const [generatedResult, setGeneratedResult] = useState<{ id: string; urls: string[]; title: string; content: string; modificationOptions?: { label: string, value: string, icon: string }[] } | null>(null);
    const [lastFullPrompt, setLastFullPrompt] = useState<string>('');
    const [lastAssets, setLastAssets] = useState<string[]>([]);
    const [lastSource, setLastSource] = useState<'competition' | 'news' | null>(null);
    const { mutate: saveMemory } = useSaveMemory();
    const { mutate: deleteMemory } = useDeleteMemory();
    const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
    const [analyzedCache, setAnalyzedCache] = useState<Record<string, string>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showTokensModal, setShowTokensModal] = useState(false);
    const [tokensErrorMsg, setTokensErrorMsg] = useState('');
    const navigate = useNavigate();
    const { createChat } = useChat();
    const { data: objectives } = useObjectives();

    // Load ideas from localStorage on mount
    useEffect(() => {
        const savedIdeas = localStorage.getItem('nexo_generated_ideas');
        const savedTimestamp = localStorage.getItem('nexo_ideas_timestamp');

        if (savedIdeas && savedTimestamp) {
            const now = new Date().getTime();
            const oneDay = 24 * 60 * 60 * 1000;
            if (now - parseInt(savedTimestamp) < oneDay) {
                setIdeas(JSON.parse(savedIdeas));
                const savedSource = localStorage.getItem('nexo_ideas_source');
                if (savedSource) setLastSource(savedSource as any);
            } else {
                localStorage.removeItem('nexo_generated_ideas');
                localStorage.removeItem('nexo_ideas_timestamp');
                localStorage.removeItem('nexo_ideas_source');
            }
        }
    }, []);

    // Save ideas to localStorage whenever they change
    useEffect(() => {
        if (ideas.length > 0) {
            localStorage.setItem('nexo_generated_ideas', JSON.stringify(ideas));
            localStorage.setItem('nexo_ideas_timestamp', new Date().getTime().toString());
        } else if (step === 'start') {
            localStorage.removeItem('nexo_generated_ideas');
            localStorage.removeItem('nexo_ideas_timestamp');
        }
    }, [ideas, step]);

    const NEXO_AVATAR = "https://i.ibb.co/0RHH3JLc/Nexo-hablando.png";

    const fetchIdeas = async (sourceType: 'competition' | 'news', force: boolean = false) => {
        // If we have ideas from THE SAME source, just show them. 
        // If the source is different, we generate fresh ones.
        if (!force && ideas.length > 0 && lastSource === sourceType) {
            setStep('ideas');
            return;
        }

        setLastSource(sourceType);
        localStorage.setItem('nexo_ideas_source', sourceType);
        setIsGenerating(true);
        setError(null);
        try {
            const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

            // STEP 1: Sample source data (competition OR news) - no resource_type filter, use all text entries
            const sampledComp = shuffle(competitionData.filter(m => m.content && m.content.length > 30)).slice(0, 3);
            const sampledNews = shuffle(newsData.filter(m => m.content && m.content.length > 30)).slice(0, 3);

            // STEP 2: Brand identity (text only, no images)
            const brandIdentity = shuffle(brandData.filter(m =>
                m.memory_category !== 'analisis_imagenes' &&
                m.resource_type !== 'image' &&
                m.content && m.content.length > 20
            )).slice(0, 2);

            // STEP 3: Brand image library descriptions (for smart asset suggestion)
            const brandImages = brandData
                .filter(m => (m.memory_category || '').toLowerCase() === 'analisis_imagenes' && m.title && !m.title.startsWith('Contrato Visual:'))
                .slice(0, 15);

            const sourceItems = sourceType === 'competition' ? sampledComp : sampledNews;
            const sourceName = sourceType === 'competition' ? 'Mi Competencia' : 'Noticias y Tendencias';

            if (sourceItems.length === 0) {
                throw new Error(`No hay datos en la sección "${sourceName}". Agrega análisis primero.`);
            }

            const sourceContext = sourceItems
                .map(m => `[${m.title || 'Entrada'}]: ${m.content.substring(0, 2000)}`)
                .join('\n\n---\n\n');

            const brandIdentityContext = brandIdentity
                .map(m => `- ${m.title}: ${m.content.substring(0, 300)}`)
                .join('\n');

            const brandImageList = brandImages
                .map(m => `- "${m.title}"`)
                .join('\n');

            const prompt = `Eres Nexo, estratega de datos y creador de contenido de Radikal IA.
Tu tarea es generar 5 ideas de contenido accionables. Es MÁXIMA PRIORIDAD que las ideas se sustenten ÚNICA Y EXCLUSIVAMENTE en información real y datos proporcionados en el PASO 1.

PASO 1 - DATOS CRUDOS DE ${sourceName.toUpperCase()} (FUENTE PRINCIPAL DE INFORMACIÓN):
${sourceContext}

PASO 2 - IDENTIDAD DE LA MARCA DEL USUARIO (para adaptar el tono de la idea):
${brandIdentityContext || 'Empresa profesional.'}

PASO 3 - IMÁGENES DISPONIBLES EN LA BIBLIOTECA DE MARCA (títulos):
${brandImageList || 'Ninguna.'}

INSTRUCCIONES DE SUPERVIVENCIA (SIGUE ESTO ESTRICTAMENTE):
1. Genera EXACTAMENTE 5 ideas.
2. LA REGLA DE ORO DEL "POR QUÉ": La justificación ("Por qué") DEBE estar sustentada en un dato real encontrado en el texto del PASO 1. 
   - SI ES COMPETENCIA: Menciona nombres de competidores, porcentajes de engagement, cifras o formatos que les funcionaron (Ej: "Porque [Marca Competidora] generó mayor engagement (X%) al publicar sobre sostenibilidad ambiental, lo que demuestra un interés real del nicho").
   - SI SON NOTICIAS: Menciona la tendencia, el porcentaje o evento específico textual de la noticia.
3. PROHIBIDO INVENTAR DATOS. Todo porcentaje o nombre mencionado debe existir en el texto del PASO 1.
4. PROHIBIDO hacer ideas genéricas basadas solo en la marca. Toda idea NACE del PASO 1 y se APLICA usando la información de la marca (PASO 2).
5. "suggested_assets": Copia los títulos exactos de las imágenes del PASO 3 que mejor ilustren la idea.
6. TODO EL CONTENIDO (Títulos, Descripciones, Sugerencias Visuales) debe estar en ESPAÑOL.

FORMATO DE RESPUESTA (SÓLO ARRAY JSON, NADA DE TEXTO EXTRA):
ESTRICTAMENTE PROHIBIDO RESPONDER CON TEXTO CONVERSACIONAL O EXCUSAS (ej. "lo siento, no hay suficientes datos"). Si sientes que hay pocos datos en el PASO 1, HAZ TU MEJOR ESFUERZO extrayendo CUALQUIER pequeña métrica o nombre que encuentres, pero SIEMPRE debes retornar el array JSON con las 5 ideas.

[
  {
    "title": "Título creativo",
    "description": "Qué: [Idea de contenido concreta]. Por qué: [DATO DURO EXTRAÍDO DEL PASO 1 (obligatorio usar cualquier métrica, nombre o hecho que encuentres) + cómo se adapta a tu marca]",
    "platform": "Instagram" o "LinkedIn",
    "type": "pilar" o "carrusel",
    "image_count": 1 a 3,
    "visual_suggestion": "Instrucción visual en ESPAÑOL sin nombrar explícitamente a la competencia",
    "suggested_assets": ["Título de imagen de la biblioteca"]
  },
  { /* idea 2 */ },
  { /* idea 3 */ },
  { /* idea 4 */ },
  { /* idea 5 */ }
]`;


            const response = await callOpenRouter('openai/gpt-4o-mini', [
                { role: 'user', content: prompt }
            ]);


            // Simple, reliable JSON extraction
            const firstBracket = response.indexOf('[');
            const lastBracket = response.lastIndexOf(']');

            if (firstBracket === -1 || lastBracket === -1 || lastBracket <= firstBracket) {
                console.error("No JSON array found. Response:", response.substring(0, 200));
                throw new Error("Nexo no entregó ideas en formato válido. Intenta de nuevo.");
            }

            const jsonStr = response.substring(firstBracket, lastBracket + 1);

            try {
                const parsedIdeas = JSON.parse(jsonStr);
                if (Array.isArray(parsedIdeas) && parsedIdeas.length > 0) {
                    setIdeas(parsedIdeas);
                    setStep('ideas');
                } else {
                    throw new Error("Formato inválido");
                }
            } catch (pErr) {
                console.error("JSON Parse Error:", pErr, "JSON length:", jsonStr.length, "Last 50 chars:", jsonStr.substring(jsonStr.length - 50));
                throw new Error("Nexo entregó un formato ilegible. Intenta de nuevo.");
            }
        } catch (err: any) {
            console.error("Ideation Error:", err);
            setError(err.message || "Nexo está procesando mucho volumen. Intenta en un momento.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSelectIdea = (idea: ContentIdea) => {
        setSelectedIdea(idea);

        // Map memory objects to their URLs, but also keep reference to original memory for matching
        const assetMap = new Map<string, MemoryResource>();
        brandData
            .filter(m =>
                (m.memory_category || '').toLowerCase() === 'analisis_imagenes' &&
                !(m as any).isSubSection &&
                !m.title?.startsWith('Contrato Visual:')
            ) // EXCLUDE Nexo generations, but keep other valid BRAND images
            .forEach(m => {
                let url = null;
                try {
                    const data = JSON.parse(m.content);
                    url = data.url || data.link || data.imageUrl || m.summary;
                } catch (e) {
                    if (m.content?.startsWith('http') || m.content?.startsWith('data:image')) url = m.content;
                    else if (m.summary?.startsWith('http') || m.summary?.startsWith('data:image')) url = m.summary;
                    else {
                        const urlMatch = m.content?.match(/(https?:\/\/[^\s"'<>]+|data:image\/[^\s"'<>]+)/);
                        if (urlMatch) url = urlMatch[0];
                    }
                }
                if (url && (url.startsWith('http') || url.startsWith('data:image'))) {
                    assetMap.set(url, m);
                }
            });

        // Filter assets by domain to avoid 403/400 errors with AI providers (bot restriction)
        // Filter only DEFINITIVELY broken or non-asset domains (placeholders, trackers)
        const RESTRICTED_DOMAINS = ['pixel.wp.com', 'gravatar.com', 'doubleclick.net', 'analytics'];

        const uniqueAssets = Array.from(assetMap.keys()).filter(url => {
            const lowUrl = url.toLowerCase();
            if (lowUrl.endsWith('.svg') || lowUrl.includes('image/svg')) return false;

            const isRestricted = RESTRICTED_DOMAINS.some(domain => lowUrl.includes(domain));
            if (isRestricted) {
                console.warn(`[ContentIdeation] Filtering restricted asset: ${url}`);
                return false;
            }
            return true;
        });

        // 💡 NEW: Always shuffle the assets so the user sees variety every time they click an idea
        const shuffledUniqueAssets = [...uniqueAssets].sort(() => Math.random() - 0.5);

        setAvailableAssets(shuffledUniqueAssets);

        // SMART SELECTION: Prioritize Nexo's explicit suggestions + defaults
        const assetsToSelect = new Set<string>();
        const ideaKeywords = `${idea.title} ${idea.description} ${idea.visual_suggestion}`.toLowerCase();
        const suggestedWords = (idea.suggested_assets || []).map(s => s.toLowerCase());

        uniqueAssets.forEach(url => {
            const memory = assetMap.get(url)!;
            const lowUrl = url.toLowerCase();
            const lowTitle = (memory.title || '').toLowerCase();
            const lowContent = (memory.content || '').toLowerCase();
            const lowCategory = (memory.memory_category || '').toLowerCase();

            // 1. Check direct suggestion from Nexo (High Priority)
            const isSuggested = suggestedWords.some(word =>
                lowTitle.includes(word) || lowContent.includes(word) || lowCategory.includes(word)
            );

            // 2. Logo Priority (Always helpful unless too many assets)
            const isLogo = lowUrl.includes('logo') || lowUrl.includes('logotipo') ||
                lowTitle.includes('logo') || lowCategory.includes('logo');

            // 3. Heuristic Relevance
            const isRelevant = ideaKeywords.split(' ').some(word =>
                word.length > 4 && (lowTitle.includes(word) || lowContent.includes(word))
            );

            if (isSuggested || isLogo || isRelevant) {
                if (assetsToSelect.size < 3) {
                    assetsToSelect.add(url);
                }
            }
        });

        // Fallback Variety: Ensure varied and pseudo-random selection if not enough matches
        if (assetsToSelect.size < 2 && uniqueAssets.length > 0) {
            // Pick based on idea length plus a pseudo-random offset
            const startIdx = (idea.title.length + Math.floor(Math.random() * 10)) % uniqueAssets.length;
            uniqueAssets.slice(startIdx, startIdx + (3 - assetsToSelect.size)).forEach(url => assetsToSelect.add(url));

            // If we still didn't get enough (e.g., reached end of array), wrap around
            if (assetsToSelect.size < 2 && uniqueAssets.length > 1) {
                uniqueAssets.slice(0, 2).forEach(url => assetsToSelect.add(url));
            }
        }

        // 💡 NEW: LOGO EXTRACTION
        const logosFound: string[] = [];
        brandData.forEach(m => {
            const lowCat = (m.memory_category || '').toLowerCase();
            const lowTitle = (m.title || '').trim().toLowerCase();
            const lowContent = (m.content || '').trim().toLowerCase();
            
            // Check if it's identified as a logo (previous criteria)
            const containsLogoKeywords = lowCat === 'logo' || lowTitle.includes('logo') || lowTitle.includes('logotipo') || 
                          lowContent.includes('logo') || lowContent.includes('logotipo');
            
            // NEW CONSTRAINT: Must start with "MARCA" (ignoring stickers or product labels)
            let startsWithMarca = lowTitle.startsWith('marca') || lowContent.startsWith('marca');

            // If content is JSON, check the analysis field inside
            if (!startsWithMarca && lowContent.startsWith('{')) {
                try {
                    const data = JSON.parse(m.content);
                    const analysis = (data.analysis || '').trim().toLowerCase();
                    if (analysis.startsWith('marca')) startsWithMarca = true;
                } catch (e) { /* ignore */ }
            }
            
            const isLogo = lowCat === 'logo' || (containsLogoKeywords && startsWithMarca);
            
            if (isLogo) {
                let url = null;
                try {
                    const data = JSON.parse(m.content);
                    url = data.url || data.link || data.imageUrl || m.summary;
                } catch (e) {
                    if (m.content?.startsWith('http') || m.content?.startsWith('data:image')) url = m.content;
                    else if (m.summary?.startsWith('http') || m.summary?.startsWith('data:image')) url = m.summary;
                }
                if (url && (url.startsWith('http') || url.startsWith('data:image')) && !logosFound.includes(url)) {
                    logosFound.push(url);
                }
            }
        });
        setAvailableLogos(logosFound);
        if (logosFound.length > 0) {
            setSelectedLogoUrl(logosFound[0]); // Auto-select first logo if available
        }

        setSelectedAssets(assetsToSelect);
        setStep('refine');
    };

    const toggleAsset = (url: string) => {
        const newSet = new Set(selectedAssets);
        if (newSet.has(url)) newSet.delete(url);
        else newSet.add(url);
        setSelectedAssets(newSet);
    };

    const handleAddCustomImage = () => {
        if (!customImageUrl || (!customImageUrl.startsWith('http') && !customImageUrl.startsWith('data:image'))) return;
        setAvailableAssets(prev => [customImageUrl, ...prev]);
        setSelectedAssets(prev => new Set(prev).add(customImageUrl));
        setCustomImageUrl('');
    };

    const renderDescription = (text: string) => {
        if (!text) return null;
        // Handle variations: accents, casing, and trailing spaces
        const parts = text.split(/(Qué:|Por qué:|Que:|Por que:)/gi);
        return parts.map((part, i) => {
            const lowPart = part.toLowerCase().trim();
            if (lowPart === 'qué:' || lowPart === 'por qué:' || lowPart === 'que:' || lowPart === 'por que:') {
                return <strong key={i} className="text-slate-900 font-bold mr-1">{part}</strong>;
            }
            return part;
        });
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !userId) return;

        setIsAnalyzingImage(true);
        try {
            const reader = new FileReader();
            const base64 = await new Promise<string>((resolve, reject) => {
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            // 1. Upload to storage
            const uploadedUrl = await uploadImageFromBase64(base64, `nexo_ref_${Date.now()}`);
            const finalUrl = uploadedUrl || base64;

            // 2. Analyze with AI
            const analysisPrompt = `
                Analiza esta imagen minuciosamente para usarla como referencia en una campaña de marketing.
                Describe: estilo visual, composición, elementos clave, colores y atmósfera.
                Responde de forma concisa pero técnica en español.
            `;

            const analysis = await callOpenRouter('openai/gpt-4o-mini', [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: analysisPrompt },
                        { type: 'image_url', image_url: { url: base64 } }
                    ]
                }
            ]);

            // 3. Save to library (Memory) as requested
            saveMemory({
                user_id: userId,
                project_id: activeProjectId || undefined,
                title: `Referencia: ${file.name.split('.')[0]}`,
                content: JSON.stringify({ url: finalUrl, analysis }),
                resource_type: 'image',
                memory_category: 'analisis_imagenes',
                user_confirmed: true
            });

            // 4. Update local state
            setAvailableAssets(prev => [finalUrl, ...prev]);
            setSelectedAssets(prev => new Set(prev).add(finalUrl));
            setAnalyzedCache(prev => ({ ...prev, [finalUrl]: analysis }));

        } catch (err) {
            console.error("Error uploading/analyzing image:", err);
            setError("Error al procesar la imagen de referencia.");
        } finally {
            setIsAnalyzingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleGenerateFinal = async (mode: 'creative' | 'referential' = 'creative') => {
        if (!selectedIdea) return;

        try {
            const canUse = await tokenRepository.canUseService(userId, 'image_1k');
            if (canUse && canUse.can_use === false) {
                setTokensErrorMsg(canUse.reason || 'Saldo insuficiente para generar imágenes.');
                setShowTokensModal(true);
                return;
            }
        } catch (e: any) {
            setTokensErrorMsg(e.message || 'Error al validar tokens.');
            setShowTokensModal(true);
            return;
        }

        setIsThinkingImage(true);
        setError(null);
        try {
            const assetsToUse = Array.from(selectedAssets).slice(0, 3);
            
            // NEW: Add selected brand logo to assetsToUse if enabled
            if (wantsLogo && selectedLogoUrl) {
                if (!assetsToUse.includes(selectedLogoUrl)) {
                    assetsToUse.push(selectedLogoUrl);
                }
            }

            setLastAssets(assetsToUse);

            // Branding instructions from text-based brand data
            const brandingText = brandData
                .filter(m => m.resource_type !== 'image' && m.resource_type !== 'analisis_imagenes')
                .map(m => m.content)
                .join('\n')
                .substring(0, 800);

            let modeInstructions = '';
            const logoInstruction = (wantsLogo && selectedLogoUrl) ? `\n### MANDATORY LOGO PLACEMENT: Integrate the brand logo (${selectedLogoUrl}) elegantly and clearly in a corner (or following the brand's usual placement), ensuring it does not overlap essential elements. It must be highly readable.` : '';

            if (mode === 'referential') {
                modeInstructions = `
                    ### IMAGE-COMPOSITION PROTOCOL: COHESIVE INTEGRATION ###
                    ### MANDATORY ASPECT RATIO: 1:1 (SQUARE) ###
                    STRICT ROLE: You are an expert art director and compositor.
                    - TASK: Do NOT just paste the images together like a basic collage. Create a cohesive, realistic, and professional scene or editorial composition using all provided visual elements.
                    - SUBJECT LOCK: You may change the perspective, angle, lighting, or setting to make the composition dynamic and logical, BUT you MUST strictly maintain the exact identity, textures, and label details of the main product/subject. It must still be the exact same product.
                    - AUTHORIZED: Better lighting, high-end studio or lifestyle background, sharp focus, dynamic angles.
                    - FORMAT: 1:1 SQUARE.
                `;
            } else {
                modeInstructions = `
                    ### BRAND-CENTRIC CREATIVE MODE ###
                    ### MANDATORY ASPECT RATIO: 1:1 (SQUARE) ###
                    CORE RULE: Even in creative mode, you MUST respect the brand DNA.
                    - COLOR PALETTE: Extract and use ONLY the exact hex codes/colors from the reference images (Logo and Assets).
                    - LOGO INTEGRITY: Place the brand logo clearly. NEVER alter its shape, font, or color.
                    - TYPOGRAPHY: Use clean, bold, premium sans-serif typography that matches the "OFERTA HOT" style in references.
                    - SCENE: Create a new setting (lifestyle/studio) but keep the identity clean and professional.
                    - NEGATIVE: No chaotic elements, no distorted logos, no neon colors unless present in the brand.
                    - FORMAT: 1:1 SQUARE.
                `;
            }

            // Use ONLY analysis from SELECTED assets
            const selectedContexts = Array.from(selectedAssets)
                .map(url => analyzedCache[url])
                .filter(Boolean);

            const imageCount = selectedIdea.type === 'carrusel' ? (selectedIdea.image_count || 3) : 1;

            // Build prompt differently based on mode
            let basePrompt: string;

            if (mode === 'referential') {
                const logoAssets = assetsToUse.filter(url =>
                    url.toLowerCase().includes('logo') || brandData.some(m => (m.summary === url || m.content.includes(url)) && /logo/i.test(m.title))
                );
                const productAssets = assetsToUse.filter(url => !logoAssets.includes(url));

                basePrompt = `
                    IMAGE-COMPOSITION TASK: 1:1 SQUARE FORMAT.
                    CREATE A UNIFIED COMPOSITION WITH SENSE, integrating these elements:
                    ${productAssets.length > 0 ? `PRODUCT/SUBJECT (Maintain EXACT identity, but you can change angle/perspective): ${productAssets.join(', ')}` : ''}
                    ONLY ADD: brand text overlay "${selectedIdea.title}" IN SPANISH (as provided) in premium typography (optional if it clutters).
                    BACKGROUND: Create a cohesive environment (lifestyle or high-end studio) that links the elements logically.
                    NEGATIVE: Do not make a flat collage, do not distort the product shape or label.
                    ${modeInstructions}
                    ${logoInstruction}
                `.trim();
            } else {
                // CREATIVE: Full descriptive prompt
                basePrompt = `
                    TASK: Generate a high-quality professional marketing image for: ${selectedIdea.title}.
                    VISUAL CONCEPT: ${selectedIdea.visual_suggestion}.
                    PLATFORM: ${selectedIdea.platform}.
                    BRAND IDENTITY: ${brandingText}.
                    ${selectedContexts.length > 0 ? `REFERENCE CONTEXT: ${selectedContexts.join('\n')}` : ''}
                    ${modeInstructions}
                    STYLE: Professional photography, clean, premium, 4k, marketing quality.
                    FORMAT: Square (1:1 aspect ratio).
                    ${logoInstruction}
                `.trim();
            }

            setLastFullPrompt(basePrompt);

            // Generate images (multiple if carousel)
            const prompts = Array.from({ length: imageCount }, (_, i) => {
                if (imageCount > 1) {
                    return `${basePrompt}\nThis is image ${i + 1} of a ${imageCount} image carousel. Ensure it tells a progression or part of the story.`;
                }
                return basePrompt;
            });

            const fallbackAssets = availableAssets.filter(a => !assetsToUse.includes(a));
            const imageUrls = await Promise.all(prompts.map(p => generateImage(p, assetsToUse, fallbackAssets)));
            const validUrls = imageUrls.filter(Boolean);
            if (validUrls.length > 0) {
                saveMemory({
                    user_id: userId,
                    project_id: activeProjectId || undefined,
                    title: `Contrato Visual: ${selectedIdea.title}`,
                    content: JSON.stringify({
                        strategy: selectedIdea.description,
                        visual_prompt: selectedIdea.visual_suggestion,
                        platform: selectedIdea.platform,
                        urls: validUrls
                    }),
                    resource_type: 'analisis_imagenes',
                    memory_category: 'analisis_imagenes',
                    summary: validUrls[0], // Keep first as thumbnail
                    tags: lastSource ? [lastSource] : [],
                    user_confirmed: true
                }, {
                    onSuccess: (newMemory) => {
                        setGeneratedResult({
                            id: newMemory.id!,
                            urls: validUrls,
                            title: selectedIdea.title,
                            content: `Estrategia Nexo: ${selectedIdea.description}`
                        });
                    }
                });

                // Remove ONLY the selected idea
                const remainingIdeas = ideas.filter(i => i.title !== selectedIdea.title);
                setIdeas(remainingIdeas);

                try {
                    const totalTokens = PRICING_TR.BASE_FEE_JOB + (PRICING_TR.IMAGE_1K * validUrls.length);
                    await tokenRepository.spendTokensExact(
                        userId,
                        totalTokens,
                        `Imagen Generada Nexo (${validUrls.length} imágenes)`,
                        { images1k: validUrls.length }
                    );
                } catch (e) { console.error("Error deduciendo saldo", e) }

                if (remainingIdeas.length === 0) {
                    setStep('start');
                } else {
                    setStep('ideas');
                }
                setSelectedIdea(null);
            }
        } catch (e: any) {
            console.error(e);
            if (e.message === 'SERVICIO_TEMPORALMENTE_FUERA_DE_SERVICIO') {
                setError("El servicio de generación de imágenes está temporalmente fuera de servicio. Por favor, intenta más tarde.");
            } else {
                setError("Error al generar la imagen. Intenta de nuevo.");
            }
        } finally {
            setIsThinkingImage(false);
        }
    };

    const handleContinueToChat = async (imageUrl: string) => {
        if (!userId || !generatedResult) return;

        try {
            // 1. Find the correct objective (Generación de contenido)
            const contentObjective = objectives?.find(obj =>
                obj.name.toLowerCase().includes('contenido') ||
                obj.name.toLowerCase().includes('nexo')
            ) || objectives?.[0];

            if (!contentObjective) {
                setError("No se pudo encontrar un objetivo de chat válido.");
                return;
            }

            // 2. Create the chat
            const chat = await createChat({
                userId,
                projectId: activeProjectId,
                objectiveId: contentObjective.id,
                title: `Refinamiento: ${generatedResult.title}`
            });

            // 3. Prepare the trigger message
            let strategyText = generatedResult.content;
            try {
                const parsed = JSON.parse(generatedResult.content);
                if (parsed.strategy) strategyText = parsed.strategy;
            } catch (e) { /* already string */ }

            const triggerMessage = `[REAJUSTE_SISTEMA] Hola Nexo. Quiero hacer unos ajustes quirúrgicos a esta imagen.

IDEA ORIGINAL: ${generatedResult.title}
ESTRATEGIA: ${strategyText.substring(0, 400)}${strategyText.length > 400 ? '...' : ''}

Por favor, analízala y dime qué cambios puntuales deseas que hagamos (fondo, iluminación, sustitución de logo por uno oficial de mi biblioteca, etc).`;

            // 4. Save the initial message and navigate
            await supabase.from('messages').insert({
                chat_id: chat.id,
                role: 'user',
                content: triggerMessage,
                image_url: imageUrl
            });

            // 5. Navigate to the chat
            navigate(`/chat/${chat.id}`);

        } catch (e) {
            console.error("Error transitioning to chat:", e);
            setError("No se pudo iniciar el chat de refinamiento.");
        }
    };


    const handleDeleteFinal = (id: string) => {
        deleteMemory({ memoryId: id, userId, projectId: activeProjectId || null });
        setGeneratedResult(null);
    };

    return (
        <div className="mb-12">
            {step === 'start' && (
                <div className="flex flex-col items-center py-20 px-8 bg-white rounded-[3.5rem] border border-slate-100 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] text-center animate-in fade-in zoom-in duration-700 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>

                    <div className="w-40 h-40 rounded-full p-1 bg-gradient-to-tr from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] mb-10 relative">
                        <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/20 animate-[spin_30s_linear_infinite]"></div>
                        <div className="w-full h-full rounded-full overflow-hidden border-8 border-white shadow-2xl">
                            <img src={NEXO_AVATAR} alt="Nexo" className="w-full h-full object-cover" />
                        </div>
                    </div>

                    <h2 className="text-4xl font-black text-slate-900 mb-6 tracking-tight">Soy Nexo, ¿Qué ideamos hoy?</h2>
                    <p className="text-slate-500 max-w-xl mb-12 text-xl leading-relaxed font-medium">
                        Puedo transformar tu ventaja competitiva o las últimas noticias en piezas de contenido de impacto radical.
                    </p>

                    <div className="flex flex-wrap justify-center gap-6">
                        <div className="flex flex-col items-center gap-8">
                            <button
                                onClick={() => fetchIdeas('competition')}
                                disabled={isGenerating}
                                className="group relative px-10 py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 overflow-hidden"
                            >
                                <span className="relative z-10 flex items-center gap-3">
                                    <span className="material-symbols-outlined text-lg">insights</span>
                                    Desde Competencia
                                </span>
                            </button>
                        </div>

                        <div className="flex flex-col items-center gap-8">
                            <button
                                onClick={() => fetchIdeas('news')}
                                disabled={isGenerating}
                                className="group relative px-10 py-6 bg-white text-slate-900 border-2 border-slate-900 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] hover:bg-slate-50 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50"
                            >
                                <span className="relative z-10 flex items-center gap-3">
                                    <span className="material-symbols-outlined text-lg">newspaper</span>
                                    Desde Noticias
                                </span>
                            </button>

                        </div>
                    </div>

                    {
                        isGenerating && (
                            <div className="mt-12 flex flex-col items-center animate-bounce">
                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Nexo está conectando neuronas...</span>
                            </div>
                        )
                    }

                    {error && <p className="mt-8 text-xs text-rose-500 font-bold uppercase tracking-widest bg-rose-50 px-6 py-3 rounded-full">{error}</p>}
                </div >
            )
            }

            {
                step === 'ideas' && (
                    <div className="animate-in slide-in-from-bottom-8 duration-700 bg-slate-50/50 p-8 md:p-12 rounded-[4rem] border border-white">
                        <div className="flex flex-col md:flex-row items-center justify-between mb-16 gap-8">
                            <div className="flex items-center gap-6 text-left">
                                <div className="w-20 h-20 rounded-3xl overflow-hidden border-4 border-white shadow-2xl rotate-3">
                                    <img src={NEXO_AVATAR} />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 text-4xl uppercase tracking-tighter">Propuestas de Nexo</h3>
                                    <p className="text-sm text-[hsl(var(--color-primary))] font-black uppercase tracking-widest mt-1">Selecciona una ruta para materializar</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => fetchIdeas('competition', true)}
                                    className="px-6 py-4 rounded-2xl bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-sm">refresh</span>
                                    NUEVAS IDEAS
                                </button>
                                <button
                                    onClick={() => setStep('start')}
                                    className="px-6 py-4 rounded-2xl bg-rose-50 border border-rose-100 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-100 transition-all"
                                >
                                    VOLVER
                                </button>
                            </div>
                        </div>

                        {/* Low Balance Alert */}
                        {wallet && wallet.balance < 100 && wallet.balance > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm mb-6 max-w-4xl mx-auto w-full">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-500 shadow-xs border border-amber-100">
                                        <span className="material-symbols-outlined">warning</span>
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-amber-900 leading-none">Tu saldo es bajo ({wallet.balance} TR)</div>
                                        <div className="text-xs text-amber-700 mt-1">Recarga ahora para seguir generando contenido sin interrupciones.</div>
                                    </div>
                                </div>
                                <NavLink to="/tokens">
                                    <Button size="sm" className="bg-amber-500 hover:bg-amber-600 border-none !text-white font-bold h-9">
                                        Recargar
                                    </Button>
                                </NavLink>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                            {ideas.map((idea, index) => (
                                <div
                                    key={index}
                                    className="group flex flex-col bg-white rounded-[3rem] border border-slate-100 p-10 hover:border-[hsl(var(--color-primary))] transition-all duration-500 shadow-sm hover:shadow-2xl relative overflow-hidden h-full cursor-pointer hover:-translate-y-2"
                                    onClick={() => handleSelectIdea(idea)}
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-[hsl(var(--color-primary)/0.03)] rounded-bl-full"></div>
                                    <div className="z-10 relative h-full flex flex-col">
                                        <div className="flex justify-between items-start mb-6">
                                            <span className="px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-widest">{idea.platform}</span>
                                            <span className={clsx(
                                                "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                                                idea.type === 'carrusel' ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                                            )}>
                                                {idea.type === 'carrusel' ? `Carrusel (${idea.image_count} imgs)` : 'Post Único'}
                                            </span>
                                        </div>

                                        <h4 className="text-xl font-black text-slate-900 mb-4 leading-tight group-hover:text-[hsl(var(--color-primary))] transition-colors line-clamp-2">{idea.title}</h4>

                                        <div className="flex-1">
                                            <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-4 font-medium italic opacity-85">
                                                {renderDescription(idea.description)}
                                            </p>
                                        </div>

                                        <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between text-primary font-black text-[9px] uppercase tracking-[0.2em]">
                                            <span>Materializar idea</span>
                                            <span className="material-symbols-outlined text-base group-hover:translate-x-2 transition-transform">arrow_forward</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            {
                step === 'refine' && selectedIdea && (
                    <div className="animate-in zoom-in duration-500 bg-white p-10 md:p-16 rounded-[4rem] border-4 border-slate-50 shadow-2xl max-w-6xl mx-auto overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl"></div>

                        <div className="flex items-center gap-4 mb-12">
                            <button onClick={() => setStep('ideas')} className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-slate-50 transition-colors">
                                <span className="material-symbols-outlined text-slate-400">arrow_back</span>
                            </button>
                            <h3 className="font-black text-slate-900 text-3xl uppercase tracking-tighter">Personalización de Marca</h3>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                            <div className="space-y-10">
                                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest block mb-4">Ruta Seleccionada</span>
                                    <h4 className="text-2xl font-black text-slate-900 mb-4">{selectedIdea.title}</h4>
                                    <p className="text-sm text-slate-500 leading-relaxed font-medium">{renderDescription(selectedIdea.description)}</p>
                                </div>

                                {/* NEW: BRAND LOGO SELECTION */}
                                <div className="p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100">
                                    <h5 className="font-black text-slate-900 text-sm uppercase tracking-widest mb-4">¿Quieres que esta imagen lleve el logo de tu marca?</h5>
                                    
                                    <div className="flex gap-4 mb-6">
                                        <button 
                                            onClick={() => setWantsLogo(false)}
                                            className={clsx(
                                                "flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all",
                                                !wantsLogo ? "bg-slate-900 text-white shadow-xl" : "bg-white text-slate-400 border border-slate-200"
                                            )}
                                        >
                                            Sin Logo
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setWantsLogo(true);
                                                if (availableLogos.length > 0 && !selectedLogoUrl) {
                                                    setSelectedLogoUrl(availableLogos[0]);
                                                }
                                            }}
                                            className={clsx(
                                                "flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all",
                                                wantsLogo ? "bg-[hsl(var(--color-primary))] text-white shadow-xl" : "bg-white text-slate-400 border border-slate-200"
                                            )}
                                        >
                                            Con Logo
                                        </button>
                                    </div>

                                    {wantsLogo && availableLogos.length > 0 && (
                                        <div className="p-4 bg-white rounded-3xl border border-slate-100 shadow-inner">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Selecciona la versión del logo</p>
                                            <div className="flex flex-wrap justify-center gap-3">
                                                {availableLogos.map((url, i) => (
                                                    <div 
                                                        key={i}
                                                        onClick={() => setSelectedLogoUrl(url)}
                                                        className={clsx(
                                                            "w-16 h-16 rounded-xl border-2 transition-all p-2 cursor-pointer flex items-center justify-center overflow-hidden",
                                                            // ALWAYS use the brand primary color as background for logos to make white variants visible
                                                            "bg-[hsl(var(--color-primary))]",
                                                            selectedLogoUrl === url ? "border-white scale-110 shadow-xl ring-4 ring-[hsl(var(--color-primary)/0.2)]" : "border-slate-200/20 opacity-80 hover:opacity-100"
                                                        )}
                                                    >
                                                        <img src={url} className="w-full h-full object-contain" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {wantsLogo && availableLogos.length === 0 && (
                                        <div className="p-4 bg-amber-50 border border-amber-100 rounded-3xl text-center">
                                            <p className="text-[10px] text-amber-600 font-bold italic">No detectamos logotipos en tu biblioteca de marca. Sube uno abajo para usarlo.</p>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h5 className="font-black text-slate-900 text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">image</span>
                                        Referencias y Activos (Max 3)
                                    </h5>

                                    {availableAssets.length === 0 ? (
                                        <div className="py-10 border-2 border-dashed border-slate-200 rounded-3xl text-center">
                                            <p className="text-xs text-slate-400 font-bold">No hay activos visuales guardados aún.</p>
                                        </div>
                                    ) : (
                                        <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar mb-6">
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                {availableAssets.map((url, i) => {
                                                    const isSelected = selectedAssets.has(url);
                                                    return (
                                                        <div
                                                            key={i}
                                                            onClick={() => toggleAsset(url)}
                                                            className={clsx(
                                                                "relative aspect-square rounded-2xl overflow-hidden cursor-pointer border-4 transition-all duration-300",
                                                                isSelected
                                                                    ? "border-primary scale-100 shadow-xl z-10"
                                                                    : "border-transparent opacity-40 grayscale-[0.5] hover:opacity-70 scale-90"
                                                            )}
                                                        >
                                                            <img src={url} className="w-full h-full object-cover" />
                                                            {isSelected && (
                                                                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                                                    <div className="bg-primary text-white p-1 rounded-full shadow-lg">
                                                                        <span className="material-symbols-outlined text-sm font-black">check</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-3">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isAnalyzingImage}
                                            className="flex-1 px-6 py-4 bg-white border-2 border-dashed border-slate-200 text-slate-500 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
                                        >
                                            {isAnalyzingImage ? (
                                                <>
                                                    <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                                                    ANALIZANDO...
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-sm">cloud_upload</span>
                                                    SUBIR IMAGEN Y ANALIZAR
                                                </>
                                            )}
                                        </button>
                                        <input
                                            value={customImageUrl}
                                            onChange={(e) => setCustomImageUrl(e.target.value)}
                                            placeholder="O pegar URL..."
                                            className="w-1/3 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 text-xs outline-none focus:border-primary transition-all font-medium"
                                        />
                                        <button
                                            onClick={handleAddCustomImage}
                                            className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95"
                                        >
                                            Añadir
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-4 italic">Sube una imagen para que Nexo la analice e integre su contexto en la idea final.</p>
                                </div>
                            </div>

                            <div className="flex flex-col justify-between sticky top-8 self-start">
                                <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                                    <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-[120px] opacity-5 -rotate-12 group-hover:scale-110 transition-transform duration-700">auto_awesome</span>
                                    <h5 className="font-black text-xl uppercase tracking-widest mb-6">Brain Proposal</h5>
                                    <p className="text-sm text-slate-300 leading-relaxed mb-10 font-medium italic">
                                        "Basado en tu identidad de marca y los activos seleccionados, generaré una pieza visual premium de alta fidelidad optimizada para <strong>{selectedIdea.platform}</strong>."
                                    </p>

                                    <div className="flex flex-col gap-4">
                                        <button
                                            onClick={() => handleGenerateFinal('creative')}
                                            disabled={isThinkingImage}
                                            className={clsx(
                                                "w-full py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all flex items-center justify-center gap-4 border-none shadow-xl active:scale-95",
                                                isThinkingImage
                                                    ? "bg-slate-800 text-slate-500 animate-pulse"
                                                    : "bg-white text-slate-900 hover:bg-primary hover:text-white"
                                            )}
                                        >
                                            {isThinkingImage ? (
                                                <>
                                                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                                    GENERANDO...
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined">auto_awesome</span>
                                                    MODO CREATIVO
                                                </>
                                            )}
                                        </button>

                                        <button
                                            onClick={() => handleGenerateFinal('referential')}
                                            disabled={isThinkingImage || selectedAssets.size === 0}
                                            className={clsx(
                                                "w-full py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all flex items-center justify-center gap-4 border-2 active:scale-95 shadow-xl",
                                                isThinkingImage
                                                    ? "bg-slate-800 border-transparent text-slate-500 animate-pulse"
                                                    : selectedAssets.size === 0
                                                        ? "bg-slate-800 border-transparent text-slate-600 cursor-not-allowed opacity-50"
                                                        : "bg-transparent border-white text-white hover:bg-white hover:text-slate-900"
                                            )}
                                        >
                                            <span className="material-symbols-outlined">photo_library</span>
                                            APEGADO AL REFERENTE
                                        </button>
                                    </div>

                                    {error && <p className="mt-6 text-[10px] text-rose-400 font-bold uppercase text-center">{error}</p>}
                                </div>

                                <p className="text-[10px] text-slate-400 text-center mt-10 uppercase tracking-[0.3em] font-black opacity-30">Power by Radikal Imagen 3</p>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                generatedResult && (
                    <ImageOverlay
                        isOpen={!!generatedResult}
                        onClose={() => setGeneratedResult(null)}
                        imageUrls={generatedResult.urls}
                        title={generatedResult.title}
                        content={generatedResult.content}
                        showNexo={true}
                        onDelete={() => handleDeleteFinal(generatedResult.id)}
                        onContinueToChat={handleContinueToChat}
                    />
                )
            }

            <InsufficientTokensModal
                isOpen={showTokensModal}
                onClose={() => setShowTokensModal(false)}
                message={tokensErrorMsg}
            />
        </div>
    );
};
