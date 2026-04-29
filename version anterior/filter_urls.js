import fs from 'fs';

const data = JSON.parse(fs.readFileSync('db_images_full.json', 'utf8'));

const filtered = data.filter(m => {
  return m.url.startsWith('http') && 
         !m.url.includes('supabase.co') && 
         !m.url.includes('base64');
});

console.log(`Found ${filtered.length} external URLs.`);
console.log(JSON.stringify(filtered, null, 2));
