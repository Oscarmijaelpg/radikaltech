const https = require('https');

// Test the onboarding/step endpoint directly
// We need a valid JWT - let's use the Supabase service role to get one
// First, let's sign in as a test user

const SUPABASE_URL = 'https://omkvmfgobmkblrjyeeqm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ta3ZtZmdvYm1rYmxyanllZXFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMzQxMzgsImV4cCI6MjA5MTgxMDEzOH0.URgUETfdaWYCs3fZkQL3LfOrFzTSoFChe6eBKd9BEA0';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ta3ZtZmdvYm1rYmxyanllZXFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjIzNDEzOCwiZXhwIjoyMDkxODEwMTM4fQ.mgnlhjfSpaYXqneUYgPzVzEndoknRr7bpSZk3tcdDEw';
const API_URL = 'http://localhost:3003';

function request(options, body) {
  return new Promise((resolve, reject) => {
    const mod = options.protocol === 'https:' || (options.hostname || '').includes('supabase') ? https : require('http');
    const req = mod.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function main() {
  // 1. Sign in as admin
  console.log('1. Signing in as admin...');
  const loginPayload = JSON.stringify({ email: 'admin@radikaltech.com', password: 'Radikal225.' });
  const loginRes = await request({
    hostname: 'omkvmfgobmkblrjyeeqm.supabase.co',
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Content-Length': Buffer.byteLength(loginPayload)
    }
  }, loginPayload);
  
  if (!loginRes.body.access_token) {
    console.error('Login failed:', loginRes.body);
    return;
  }
  
  const token = loginRes.body.access_token;
  console.log('Got token:', token.substring(0, 30) + '...');
  
  // 2. Test GET /onboarding/state
  console.log('\n2. GET /onboarding/state...');
  const http = require('http');
  const stateRes = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3003,
      path: '/api/v1/onboarding/state',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
  console.log('State status:', stateRes.status);
  console.log('State body:', stateRes.body.substring(0, 500));
  
  // 3. Test POST /onboarding/step company
  console.log('\n3. POST /onboarding/step (company)...');
  const stepBody = JSON.stringify({
    step: 'company',
    data: {
      company_name: 'Test Company',
      industry: 'E-commerce/Retail Online'
    }
  });
  const stepRes = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3003,
      path: '/api/v1/onboarding/step',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(stepBody)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(stepBody);
    req.end();
  });
  console.log('Step status:', stepRes.status);
  console.log('Step body:', stepRes.body.substring(0, 1000));
}

main().catch(console.error);
