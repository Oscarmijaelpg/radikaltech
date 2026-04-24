/**
 * Limpia el contenido extraído (HTML o Markdown) para dejar solo la información relevante
 * eliminando elementos de navegación, pies de página y ruido estructural.
 */
export function cleanWebContent(text: string): string {
    if (!text) return '';

    // Si parece HTML, hacemos una limpieza básica de etiquetas ruidosas
    let cleaned = text;
    
    if (text.includes('<')) {
        // Eliminar scripts y estilos completamente
        cleaned = cleaned.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, '');
        cleaned = cleaned.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, '');
        
        // Eliminar elementos de navegación, cabeceras y pies de página
        cleaned = cleaned.replace(/<(nav|header|footer|aside)\b[^>]*>([\s\S]*?)<\/\1>/gim, '');
        
        // Eliminar comentarios HTML
        cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
    }

    // Limpieza de Markdown si se detecta
    // Eliminar links repetitivos (redes sociales, menús)
    cleaned = cleaned.replace(/\[([^\]]+)\]\(https?:\/\/(?:www\.)?(?:facebook|instagram|twitter|linkedin|tiktok|youtube|threads|pinterest)\.com\/[^)]+\)/gi, '');
    
    // Eliminar espacios en blanco excesivos y saltos de línea múltiples
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');

    // Limitar tamaño para no saturar al agente si la página es gigantesca (max 15k chars por página limpia)
    if (cleaned.length > 15000) {
        cleaned = cleaned.substring(0, 15000) + '... [Contenido truncado por ruido]';
    }

    return cleaned.trim();
}
