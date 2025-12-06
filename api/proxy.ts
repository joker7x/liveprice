// Vercel Node serverless handler without @vercel/node types to avoid TypeScript missing-module error
export default async function handler(req: any, res: any) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing GEMINI_API_KEY environment variable' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Update endpoint & payload to match the exact Gemini/Generative AI API you need.
    const response = await fetch('https://api.generativeai.google/v1beta2/models/YOUR_MODEL:generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    console.error('Proxy error', err);
    return res.status(500).json({ error: 'Proxy request failed' });
  }
}
