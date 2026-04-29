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

async function searchInstagram() {
  console.log('Searching for "instagram" in memory_resources...');
  const { data, error } = await supabase
    .from('memory_resources')
    .select('*')
    .or('content.ilike.%instagram%,title.ilike.%instagram%,summary.ilike.%instagram%')
    .limit(20);

  if (error) {
    console.error(error);
    return;
  }

  console.log(`Found ${data.length} matches.`);
  data.forEach(m => {
    console.log(`\nID: ${m.id}`);
    console.log(`Category: ${m.memory_category}`);
    console.log(`Title: ${m.title}`);
    console.log(`Summary: ${m.summary}`);
    // console.log(`Content: ${m.content.substring(0, 200)}...`);
  });
}

searchInstagram();
