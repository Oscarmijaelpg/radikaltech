import 'dotenv/config';

async function testOpenRouter() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('No OPENROUTER_API_KEY found');
    return;
  }

  const model = 'google/gemini-3.1-flash-image-preview';
  const prompt = 'Generate a simple square image of a red apple on a wooden table. High quality.';

  console.log(`Testing model: ${model}`);

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  console.log(`Status: ${res.status}`);
  const json = await res.json();
  console.log('Response:', JSON.stringify(json, null, 2));
}

testOpenRouter().catch(console.error);
