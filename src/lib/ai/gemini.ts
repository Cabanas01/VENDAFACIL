/**
 * @fileOverview Interface REST direta para a API Google Gemini v1.
 * Utiliza o modelo gemini-1.0-pro para garantir compatibilidade universal em todos os projetos.
 */

export async function askGemini(prompt: string, jsonMode: boolean = false) {
  const API_KEY = process.env.GOOGLE_GENAI_API_KEY;
  if (!API_KEY) {
    console.error('[GEMINI_REST] Erro: GOOGLE_GENAI_API_KEY não configurada.');
    throw new Error('CONFIG_MISSING');
  }

  // Gemini 1.0 Pro é o modelo mais estável e disponível universalmente no endpoint v1
  const model = 'gemini-1.0-pro';
  const endpoint = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${API_KEY}`;

  const body: any = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
  };

  // Observação: JSON mode no 1.0 Pro via REST v1 pode ser menos restrito que no 1.5,
  // mas o parâmetro é suportado para forçar a estrutura se a versão da API permitir.
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

    // Limpeza de blocos de código markdown se o modelo ignorar o jsonMode e retornar texto puro
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
