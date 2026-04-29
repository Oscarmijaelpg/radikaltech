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

async function checkWebhookLogs() {
  console.log('Querying webhook_logs...');
  const { data, error } = await supabase
    .from('webhook_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No webhook logs found.');
    return;
  }

  console.log(`Found ${data.length} logs.`);
  data.forEach(m => {
    console.log(`\nID: ${m.id}`);
    console.log(`Webhook Name: ${m.webhook_name}`);
    console.log(`Payload: ${JSON.stringify(m.payload).substring(0, 200)}...`);
    console.log(`Created At: ${m.created_at}`);
  });
}

checkWebhookLogs();
