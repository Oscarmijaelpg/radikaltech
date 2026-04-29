import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findInstagramUrls() {
  console.log('Searching for external URLs in analisis_imagenes...');
  const { data, error } = await supabase
    .from('memory_resources')
    .select('*')
    .eq('memory_category', 'analisis_imagenes')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error(error);
    return;
  }

  const matches = data.filter(m => {
    const url = m.summary || '';
    return url.startsWith('http') && !url.includes('supabase.co');
  });

  console.log(`Found ${matches.length} external URLs.`);
  matches.forEach((m, i) => {
    console.log(`\n--- Match ${i+1} ---`);
    console.log(`ID: ${m.id}`);
    console.log(`Title: ${m.title}`);
    console.log(`URL: ${m.summary}`);
    console.log(`Created At: ${m.created_at}`);
  });
}

findInstagramUrls();
