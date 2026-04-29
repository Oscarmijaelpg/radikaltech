import fs from 'fs';

let rawData;
try {
    rawData = fs.readFileSync('db_images_full.json', 'utf8');
} catch (e) {
    // If it was written as UTF-16
    rawData = fs.readFileSync('db_images_full.json', 'utf16le');
}

const data = JSON.parse(rawData);

const filtered = data.filter(m => {
  return m.url && m.url.startsWith('http') && !m.url.includes('supabase.co');
});

console.log(`Found ${filtered.length} external URLs.`);
filtered.forEach((m, i) => {
  console.log(`${i+1}. [${m.id}] ${m.url}`);
});
