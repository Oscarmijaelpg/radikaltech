import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env') });
dotenv.config({ path: resolve(__dirname, '.env.local') });

const url = process.env.VITE_SUPABASE_URL || '';
const key = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(url, key);

async function check() {
  const { data: users, error: userError } = await supabase.from('users').select('*').eq('email', 'pepito2@gmail.com');
  console.log('User:', users);
  
  if (users?.[0]) {
    const { data: userRow } = await supabase.from('users').select('additional_context').eq('id', users[0].id).single();
    if (userRow?.additional_context) {
       console.log('User Additional Context:', userRow.additional_context);
    } else {
       console.log('No additional_context for user');
    }
    
    const { data: memories } = await supabase.from('memory_resources').select('id, title, content').eq('user_id', users[0].id).ilike('memory_category', '%estadisticas%');
    console.log('Estadisticas found:', memories?.length);
    if (memories && memories.length > 0) {
      memories.forEach(m => console.log(m.title, m.content.substring(0, 100)));
    }
  }
}

check();
