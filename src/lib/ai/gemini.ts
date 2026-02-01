/**
 * @fileOverview Interface REST direta para a API Google Gemini v1.
 * Bypassa abstrações para garantir estabilidade máxima e controle de payload.
 */

export async function askGemini(prompt: string, jsonMode: boolean = false) {
  const API_KEY = process.env.GOOGLE_GENAI_API_KEY;
  if (!API_KEY) {
    console.error('[GEMINI_REST] Erro: GOOGLE_GENAI_API_KEY não configurada.');
    throw new Error('CONFIG_MISSING');
  }

  const model = 'gemini-1.5-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${API_KEY}`;

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
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[GEMINI_REST_ERROR]', res.status, errText);
      throw new Error(`API_ERROR_${res.status}`);
    }

    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('EMPTY_RESPONSE');
    }

    return jsonMode ? JSON.parse(text) : text;
  } catch (error: any) {
    console.error('[GEMINI_REST_EXCEPTION]', error);
    throw error;
  }
}
