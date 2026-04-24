import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Cargar env del backend
dotenv.config({ path: join(process.cwd(), 'apps/api/.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('Verificando buckets de Supabase...');
  
  const { data: buckets, error } = await supabase.storage.listBuckets();
  
  if (error) {
    console.error('Error al listar buckets:', error);
    return;
  }

  const bucketName = 'assets';
  const exists = buckets.find(b => b.name === bucketName);

  if (!exists) {
    console.log(`Creando bucket "${bucketName}"...`);
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 10485760, // 10MB
    });
    
    if (createError) {
      console.error(`Error al crear bucket "${bucketName}":`, createError);
    } else {
      console.log(`Bucket "${bucketName}" creado con éxito.`);
    }
  } else {
    console.log(`El bucket "${bucketName}" ya existe.`);
  }
}

main().catch(console.error);
