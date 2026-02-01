/**
 * @fileOverview Interface REST direta para a API Google Gemini v1beta.
 * Utiliza o modelo gemini-2.0-flash conforme solicitação do usuário para performance máxima.
 */

export async function askGemini(prompt: string, jsonMode: boolean = false) {
  const API_KEY = process.env.GOOGLE_GENAI_API_KEY;
  if (!API_KEY) {
    console.error('[GEMINI_REST] Erro: GOOGLE_GENAI_API_KEY não configurada.');
    throw new Error('CONFIG_MISSING');
  }

  const model = 'gemini-2.0-flash';
  // Usando v1beta conforme o curl de sucesso do usuário
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
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-goog-api-key': API_KEY 
      },
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

    // Limpeza de blocos de código markdown se o modelo retornar texto puro com backticks
    let cleanText = text;
    if (jsonMode && text.includes('```json')) {
      cleanText = text.replace(/```json|```/g, '').trim();
    }

    return jsonMode ? JSON.parse(cleanText) : text;
  } catch (error: any) {
    console.error('[GEMINI_REST_EXCEPTION]', error);
    throw error;
  }
}
