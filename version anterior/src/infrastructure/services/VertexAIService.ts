
/**
 * Google Vertex AI Service for Imagen 3
 */

const PROJECT_ID = import.meta.env.VITE_GOOGLE_PROJECT_ID;
const LOCATION = import.meta.env.VITE_GOOGLE_LOCATION || 'us-central1';
const ACCESS_TOKEN = import.meta.env.VITE_GOOGLE_ACCESS_TOKEN;

/**
 * Generates an image using direct Vertex AI Prediction API.
 * @param prompt The generation prompt
 * @param assets Optional list of image URLs (not currently used in direct prediction, but prepared for future)
 */
export const generateImageVertexAI = async (prompt: string, assets: string[] = []): Promise<string> => {
    if (!PROJECT_ID || PROJECT_ID.includes('TU_PROJECT_ID')) {
        console.error('[VertexAIService] PROJECT_ID no configurado correctamente en .env');
        return "";
    }

    if (!ACCESS_TOKEN || ACCESS_TOKEN.includes('TU_TOKEN')) {
        console.warn('[VertexAIService] ACCESS_TOKEN no configurado o es el placeholder. La generación oficial fallará.');
        console.info('Tip: Ejecuta "gcloud auth application-default print-access-token" y pégalo en el .env');
        return "";
    }

    const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/imagen-3.0-generate-001:predict`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${ACCESS_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                instances: [
                    {
                        prompt: prompt
                    }
                ],
                parameters: {
                    sampleCount: 1,
                    aspectRatio: "1:1",
                    // You can add safety settings or person generation settings here if needed
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[VertexAIService] API Error:', errorData);
            throw new Error(`Vertex AI Prediction failed: ${response.status}`);
        }

        const data = await response.json();

        // Vertex AI returns predictions[0].bytesBase64Encoded
        if (data.predictions && data.predictions.length > 0) {
            const prediction = data.predictions[0];
            const base64Content = prediction.bytesBase64Encoded || prediction.imageBytes;

            if (base64Content) {
                return `data:image/png;base64,${base64Content}`;
            }
        }

        throw new Error("No image data found in Vertex AI response");

    } catch (error) {
        console.error('[VertexAIService] Fatal error:', error);
        return "";
    }
};
