/**
 * @fileOverview Interface REST direta para a API Google Gemini v1beta.
 */

export async function askGemini(prompt: string, jsonMode: boolean = false) {
  const API_KEY = process.env.GOOGLE_GENAI_API_KEY;
  if (!API_KEY) {
    console.error('[GEMINI_REST] Erro: GOOGLE_GENAI_API_KEY não configurada.');
    throw new Error('CONFIG_MISSING');
  }

  // Mudança para 1.5-flash para maior compatibilidade com Free Tier
  const model = 'gemini-1.5-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

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
    const res = await fetch(`${endpoint}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
    });

    if (res.status === 429) {
      console.error('[GEMINI_REST] Cota de requisições excedida (429).');
      throw new Error('QUOTA_EXCEEDED');
    }

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

    let cleanText = text;
    if (jsonMode && text.includes('```json')) {
      cleanText = text.replace(/```json|```/g, '').trim();
    }

    return jsonMode ? JSON.parse(cleanText) : text;
  } catch (error: any) {
    if (error.message === 'QUOTA_EXCEEDED' || error.message === 'CONFIG_MISSING') throw error;
    console.error('[GEMINI_REST_EXCEPTION]', error);
    throw new Error('AI_UNAVAILABLE');
  }
}
