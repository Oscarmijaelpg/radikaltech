import 'dotenv/config';

async function testOpenRouterWithRef() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const imageUrl = "https://qzokrpzglelhznhobkrv.supabase.co/storage/v1/object/public/assets/7e8f0ae4-ca5c-4c36-9443-35c6595592ea/brand/logo-1776976909725.png";
  
  console.log(`Downloading ref image: ${imageUrl}`);
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    console.error('Failed to download image');
    return;
  }
  const buf = await imgRes.arrayBuffer();
  const b64 = Buffer.from(buf).toString('base64');

  const model = 'google/gemini-3.1-flash-image-preview';
  const prompt = 'Generate a high quality marketing image using this logo as a reference. The logo should be placed elegantly in the corner. Scene: A delicious dessert on a table.';

  console.log(`Testing model: ${model} with ref`);

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } }
          ]
        }
      ],
    }),
  });

  console.log(`Status: ${res.status}`);
  const json = await res.json() as any;
  console.log('FULL Response:', JSON.stringify(json, null, 2));
}

testOpenRouterWithRef().catch(console.error);
