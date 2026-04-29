import { uploadImageFromBase64, uploadImageFromUrl } from './SupabaseStorageService';

export const GOOGLE_AI_KEY = import.meta.env.VITE_GOOGLE_AI_KEY;
export const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
export const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

// Image Generation Service

/**
 * Robust recursive scanner to find image data in ANY API response structure.
 */
function findImageInObject(obj: any): string | null {
    if (!obj) return null;

    if (typeof obj === 'string') {
        const trimmed = obj.trim();
        if (trimmed.startsWith('data:image')) return trimmed;
        if (trimmed.startsWith('http') && trimmed.match(/\.(png|jpg|jpeg|webp|gif|svg)/i)) return trimmed;

        const cleanStr = trimmed.replace(/[\n\r\s]/g, '');
        if (cleanStr.length > 2000 && /^[a-zA-Z0-9+/=]+$/.test(cleanStr)) {
            return `data:image/png;base64,${cleanStr}`;
        }
        return null;
    }

    if (Array.isArray(obj)) {
        for (const item of obj) {
            const found = findImageInObject(item);
            if (found) return found;
        }
    }

    if (typeof obj === 'object') {
        const highPriorityKeys = ['images', 'image_url', 'b64_json', 'bytes', 'data'];
        for (const key of highPriorityKeys) {
            if (obj[key]) {
                const found = findImageInObject(obj[key]);
                if (found) return found;
            }
        }

        const contentKeys = ['content', 'text'];
        for (const key of contentKeys) {
            if (obj[key]) {
                const found = findImageInObject(obj[key]);
                if (found) return found;
            }
        }

        for (const key in obj) {
            if (['usage', 'id', 'model', 'object', 'created', 'provider'].includes(key)) continue;
            if ([...highPriorityKeys, ...contentKeys].includes(key)) continue;
            const found = findImageInObject(obj[key]);
            if (found) return found;
        }
    }

    return null;
}

/**
 * Ensures an image URL is persisted to Supabase Storage.
 */
const ensurePersistedUrl = async (url: string, source: string): Promise<string> => {
    try {
        if (!url) return url;

        // If it's already a base64, upload it directly
        if (url.startsWith('data:image')) {
            const pUrl = await uploadImageFromBase64(url, `gen_${source}`);
            return pUrl || url;
        }

        const permanentUrl = await uploadImageFromUrl(url, `gen_${source}`);
        if (permanentUrl) {
            return permanentUrl;
        }
        return url;
    } catch (e) {
        console.error(`[ImageGenerationService] Persistence failure for ${source}:`, e);
        return url;
    }
};

/**
 * Robust image generation service with multi-platform fallbacks.
 * @param prompt The generation prompt
 * @param assets Optional list of image URLs for multimodal models (Imagen 3 / Gemini)
 * @param fallbackAssets Images to use if one of the primary assets is inaccessible
 * @param maxRetries Max attempts if a bad asset is detected
 */
export const generateImage = async (prompt: string, assets: string[] = [], fallbackAssets: string[] = [], maxRetries: number = 3): Promise<string> => {
    let currentAssets = [...assets];
    let remainingFallback = [...fallbackAssets];
    let attempts = 0;

    while (attempts <= maxRetries) {
        attempts++;

        // --- STRATEGY 0: OPENROUTER (Gemini 3.1 Flash Image) - PRIMARY ---
        if (OPENROUTER_API_KEY) {
            try {

            const multimodalContent: any[] = [{ type: "text", text: prompt }];
            for (const assetUrl of currentAssets) {
                multimodalContent.push({ type: "image_url", image_url: { url: assetUrl } });
            }

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": typeof window !== 'undefined' ? window.location.origin : '',
                    "X-Title": "RadikalChat",
                },
                body: JSON.stringify({
                    model: "google/gemini-3.1-flash-image-preview",
                    messages: [{ role: "user", content: multimodalContent }],
                    modalities: ["image", "text"],
                })
            });

            if (response.ok) {
                const data = await response.json();
                const foundImageUrl = findImageInObject(data);
                if (foundImageUrl) {
                    return await ensurePersistedUrl(foundImageUrl, 'openrouter_gemini31_flash');
                }
            } else {
                const err = await response.text();
                console.warn(`[ImageGenerationService] OpenRouter (Gemini 3.1 Flash) failed with status ${response.status}: ${err}`);

                // BAD ASSET RETRY LOGIC
                // OpenRouter error format for bad URLs
                const match = err.match(/(?:fetching image from URL|URL did not return an image[^:]*):\s*(https?:\/\/[^\s",\}]+)/i);
                if (match) {
                    const badUrl = match[1];
                    console.warn(`[ImageGenerationService] DETECTED BAD ASSET: ${badUrl}. Removing and retrying...`);
                    currentAssets = currentAssets.filter(url => url !== badUrl);
                    if (remainingFallback.length > 0) {
                        const newAsset = remainingFallback.shift();
                        if (newAsset) {
                            currentAssets.push(newAsset);
                        }
                    } else {
                         console.warn(`[ImageGenerationService] No more fallbacks available. Continuing with ${currentAssets.length} assets.`);
                    }
                    continue; // Re-run the loop with filtered assets
                }
            }
        } catch (e) {
            console.warn('[ImageGenerationService] OpenRouter Gemini 3.1 Flash Strategy failed:', e);
        }
    }

    // --- STRATEGY 1: OPENROUTER (Gemini 3 Pro Image) - SECONDARY ---
    if (OPENROUTER_API_KEY) {
        try {

            const multimodalContent: any[] = [{ type: "text", text: prompt }];
            for (const assetUrl of currentAssets) {
                multimodalContent.push({ type: "image_url", image_url: { url: assetUrl } });
            }

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": typeof window !== 'undefined' ? window.location.origin : '',
                    "X-Title": "RadikalChat",
                },
                body: JSON.stringify({
                    model: "google/gemini-3-pro-image-preview",
                    messages: [{ role: "user", content: multimodalContent }],
                    modalities: ["image", "text"],
                })
            });

            if (response.ok) {
                const data = await response.json();

                // OpenRouter Gemini 3 Pro returns images in message.images array or as data URLs
                const foundImageUrl = findImageInObject(data);
                if (foundImageUrl) {
                    return await ensurePersistedUrl(foundImageUrl, 'openrouter_gemini3_pro');
                }
            } else {
                const err = await response.text();
                console.warn(`[ImageGenerationService] OpenRouter (Gemini 3 Pro) failed with status ${response.status}: ${err}`);

                // BAD ASSET RETRY LOGIC
                const match = err.match(/(?:fetching image from URL|URL did not return an image[^:]*):\s*(https?:\/\/[^\s",\}]+)/i);
                if (match) {
                    const badUrl = match[1];
                    console.warn(`[ImageGenerationService] DETECTED BAD ASSET: ${badUrl}. Removing and retrying...`);
                    currentAssets = currentAssets.filter(url => url !== badUrl);
                    if (remainingFallback.length > 0) {
                        const newAsset = remainingFallback.shift();
                        if (newAsset) {
                            currentAssets.push(newAsset);
                        }
                    } else {
                        console.warn(`[ImageGenerationService] No more fallbacks available. Continuing with ${currentAssets.length} assets.`);
                    }
                    continue; // Retry the loop
                }
            }
        } catch (e) {
            console.warn('[ImageGenerationService] OpenRouter Gemini 3 Pro Strategy failed:', e);
        }
    }

    // If strategy fell through or failed for a reason other than bad asset, break loop and throw below
    break;
    } // End of while loop

    // If all OpenRouter strategies fail or max retries exceeded
    console.warn('[ImageGenerationService] All OpenRouter strategies failed or were unavailable.');
    throw new Error('SERVICIO_TEMPORALMENTE_FUERA_DE_SERVICIO');
};
