import fs from 'fs';

const data = JSON.parse(fs.readFileSync('filtered_urls.json', 'utf8'));

data.forEach((m, i) => {
  console.log(`${i+1}. [${m.id}] ${m.url}`);
});
