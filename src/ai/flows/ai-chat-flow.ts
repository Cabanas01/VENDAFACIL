'use server';

/**
 * @fileOverview Fluxo de Chat de IA (SaaS Advisor) via REST v1
 */

import { askGemini } from '@/lib/ai/gemini';

export async function askAi(input: {
  messages: any[];
  contextData: string;
  scope: 'store' | 'admin';
}) {
  try {
    const systemPrompt = input.scope === 'admin' 
      ? `Você é o ANALISTA ESTRATÉGICO do VendaFácil. Analise as métricas GLOBAIS do SaaS. Responda em Markdown de forma executiva.`
      : `Você é o CONSULTOR DE NEGÓCIOS do VendaFácil. Analise estoque, vendas e lucro bruto da loja. Forneça conselhos práticos. Responda em Markdown.`;

    const lastUserMessage = input.messages[input.messages.length - 1]?.content || 'Resuma meus dados.';
    
    const prompt = `INSTRUÇÃO DE SISTEMA: ${systemPrompt}\n\nDADOS ATUAIS DO SISTEMA:\n${input.contextData}\n\nPERGUNTA DO USUÁRIO: ${lastUserMessage}`;

    const text = await askGemini(prompt);

    return { 
      text, 
      error: null 
    };

  } catch (error: any) {
    console.error('[AI_CHAT_ERROR]', error);
    return { 
      text: '', 
      error: error.message === 'CONFIG_MISSING' ? 'CONFIG_MISSING' : 'AI_UNAVAILABLE' 
    };
  }
}
