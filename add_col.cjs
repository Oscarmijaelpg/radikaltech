const https = require('https');

const data = JSON.stringify({
  query: 'ALTER TABLE projects ADD COLUMN IF NOT EXISTS onboarding_summary jsonb NULL;'
});

const options = {
  hostname: 'omkvmfgobmkblrjyeeqm.supabase.co',
  port: 443,
  path: '/rest/v1/rpc/exec_sql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ta3ZtZmdvYm1rYmxyanllZXFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjIzNDEzOCwiZXhwIjoyMDkxODEwMTM4fQ.mgnlhjfSpaYXqneUYgPzVzEndoknRr7bpSZk3tcdDEw',
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ta3ZtZmdvYm1rYmxyanllZXFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjIzNDEzOCwiZXhwIjoyMDkxODEwMTM4fQ.mgnlhjfSpaYXqneUYgPzVzEndoknRr7bpSZk3tcdDEw',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', body));
});

req.on('error', (e) => console.error('Error:', e));
req.write(data);
req.end();
