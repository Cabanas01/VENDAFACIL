'use server';

/**
 * @fileOverview Fluxo de Chat de IA utilizando Genkit v1.x e Gemini 2.0 Flash.
 * 
 * - askAi: Função principal que processa conversas contextuais.
 */

import {ai} from '@/ai/genkit';

export async function askAi(input: {
  messages: any[];
  contextData: string;
  scope: 'store' | 'admin';
}) {
  if (!process.env.GOOGLE_GENAI_API_KEY) {
    return { text: '', error: 'CONFIG_MISSING' };
  }

  try {
    const systemPrompt = input.scope === 'admin' 
      ? `Você é o ANALISTA ESTRATÉGICO do VendaFácil. Analise as métricas GLOBAIS do SaaS. Responda em Markdown de forma executiva.`
      : `Você é o CONSULTOR DE NEGÓCIOS do VendaFácil. Analise estoque, vendas e lucro bruto da loja. Forneça conselhos práticos. Responda em Markdown.`;

    const lastUserMessage = input.messages[input.messages.length - 1]?.content || 'Resuma meus dados.';
    
    const fullPrompt = `CONTEXTO DE DADOS ATUAL:\n${input.contextData}\n\nPERGUNTA DO USUÁRIO: ${lastUserMessage}`;

    const result = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      messages: [
        {
          role: 'system',
          content: [{ text: systemPrompt }],
        },
        {
          role: 'user',
          content: [{ text: fullPrompt }],
        },
      ],
    });

    return { 
      text: result.text, 
      error: null 
    };

  } catch (error: any) {
    console.error('[AI_CHAT_FLOW_ERROR]', error);
    
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('quota') || msg.includes('429')) {
      return { text: '', error: 'QUOTA_EXCEEDED' };
    }
    
    return { 
      text: '', 
      error: 'AI_UNAVAILABLE' 
    };
  }
}
