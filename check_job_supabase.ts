import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Usar variables del .env de la API
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qzokrpzglelhznhobkrv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: job, error } = await supabase
    .from('ai_jobs')
    .select('*')
    .eq('kind', 'image_generate')
    .order('createdAt', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching job:', error);
    return;
  }

  console.log(JSON.stringify(job, null, 2));
}

main().catch(console.error);
