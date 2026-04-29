
import { supabase } from '../supabase/client';

/**
 * Service to handle image uploads to Supabase Storage.
 */
export const uploadImageFromBase64 = async (base64Data: string, fileName: string): Promise<string | null> => {
    try {
        // 1. Clean base64 string
        const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');

        // 2. Convert to Blob
        const byteCharacters = atob(base64Content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });

        // 3. Upload to Supabase
        const { data, error } = await supabase.storage
            .from('files')
            .upload(`images/${Date.now()}_${fileName}.png`, blob, {
                contentType: 'image/png',
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('[SupabaseStorageService] Upload failed:', error.message);
            return null;
        }

        // 4. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('files')
            .getPublicUrl(data.path);

        return publicUrl;
    } catch (error) {
        console.error('[SupabaseStorageService] Fatal error during upload:', error);
        return null;
    }
};
/**
 * Service to handle generic file uploads to Supabase Storage.
 */
export const uploadFile = async (file: File, folder: string = 'documents'): Promise<string | null> => {
    try {
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const filePath = `${folder}/${fileName}`;

        const { data, error } = await supabase.storage
            .from('files')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('[SupabaseStorageService] File upload failed:', error.message);
            return null;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('files')
            .getPublicUrl(data.path);

        return publicUrl;
    } catch (error) {
        console.error('[SupabaseStorageService] Fatal error during file upload:', error);
        return null;
    }
};

/**
 * Uploads an image from a URL to Supabase Storage using a server-side Edge Function.
 * This evades browser CORS restrictions.
 */
export const uploadImageFromUrl = async (url: string, fileName: string): Promise<string | null> => {
    try {
        
        // 1. Check if already a Supabase public URL (to avoid double uploads)
        if (url.includes('.supabase.co/storage/v1/object/public/')) {
            return url;
        }

        
        // 2. Invoke the Edge Function
        const { data, error } = await supabase.functions.invoke('persist-image', {
            body: { imageUrl: url, fileName }
        });

        if (error) {
            console.error('[SupabaseStorageService] Edge Function invocation failed:', error);
            // Fallback to original URL if persistence fails
            return null;
        }

        if (data?.error) {
            console.error('[SupabaseStorageService] Edge Function returned error:', data.error);
            return null;
        }

        if (data?.publicUrl) {
            return data.publicUrl;
        }

        console.warn('[SupabaseStorageService] Edge Function returned no publicUrl');
        return null;
    } catch (error) {
        console.error('[SupabaseStorageService] Fatal error in uploadImageFromUrl (Server-side):', error);
        return null;
    }
};
