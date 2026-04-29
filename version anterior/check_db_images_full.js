import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkMemories() {
  const { data, error } = await supabase
    .from('memory_resources')
    .select('*')
    .eq('memory_category', 'analisis_imagenes')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error(error);
    return;
  }

  const result = data.map(m => {
    let url = m.summary || '';
    let parsedContent = null;
    try {
        parsedContent = JSON.parse(m.content);
        if (!url || !url.startsWith('http')) {
            url = parsedContent.url || parsedContent.imageUrl || parsedContent.link || parsedContent.image_url || url;
        }
    } catch(e) {
        if (!url) url = m.content.startsWith('http') ? m.content : 'NO_URL_FOUND';
    }
    
    return {
        id: m.id,
        title: m.title,
        url: url,
        created_at: m.created_at,
        category: m.memory_category
    };
  });

  fs.writeFileSync('db_images_full.json', JSON.stringify(result, null, 2));
  console.log('Saved to db_images_full.json');
}

checkMemories();
