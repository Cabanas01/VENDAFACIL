/**
 * @fileOverview Interface REST direta para a API Google Gemini v1 estável.
 * 
 * Baseline de segurança utilizando Gemini 2.0 Flash.
 */

export async function askGemini(prompt: string, jsonMode: boolean = false) {
  const API_KEY = process.env.GOOGLE_GENAI_API_KEY;
  if (!API_KEY) {
    throw new Error('CONFIG_MISSING');
  }

  // Gemini 2.0 Flash é o modelo mais estável para API v1 atualmente
  const model = 'gemini-2.0-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`;

  const body: any = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
  };

  if (jsonMode) {
    body.generationConfig = {
      response_mime_type: 'application/json',
    };
  }

  try {
    const res = await fetch(`${endpoint}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-goog-api-key': API_KEY
      },
      body: JSON.stringify(body),
    });

    if (res.status === 429) throw new Error('QUOTA_EXCEEDED');

    if (!res.ok) {
      const errText = await res.text();
      console.error('[GEMINI_REST_ERROR]', res.status, errText);
      throw new Error(`API_ERROR_${res.status}`);
    }

    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) throw new Error('EMPTY_RESPONSE');

    return jsonMode ? JSON.parse(text) : text;
  } catch (error: any) {
    console.error('[GEMINI_REST_EXCEPTION]', error);
    throw error;
  }
}
