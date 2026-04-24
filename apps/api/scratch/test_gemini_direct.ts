import 'dotenv/config';

async function testGeminiDirect() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('No GEMINI_API_KEY found');
    return;
  }

  // Intentar un modelo estándar para ver si la llave funciona
  const model = 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  console.log(`Testing Gemini Direct: ${model}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Hello, respond with "OK" if you see this.' }] }]
    }),
  });

  console.log(`Status: ${res.status}`);
  const json = await res.json();
  console.log('Response:', JSON.stringify(json, null, 2));
}

testGeminiDirect().catch(console.error);
