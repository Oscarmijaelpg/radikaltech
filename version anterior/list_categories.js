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

async function listCategories() {
  const { data, error } = await supabase
    .from('memory_resources')
    .select('memory_category');

  if (error) {
    console.error(error);
    return;
  }

  const categories = [...new Set(data.map(m => m.memory_category))];
  console.log('Categories:', categories);
}

listCategories();
