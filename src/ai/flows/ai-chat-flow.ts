'use server';

/**
 * @fileOverview Fluxo de Chat de IA (SaaS Advisor)
 * 
 * Implementado via Genkit v1.x. 
 * Utiliza a instância global de IA para garantir o uso do modelo gemini-1.5-flash.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const AiChatInputSchema = z.object({
  messages: z.array(MessageSchema),
  contextData: z.string().describe('Snapshot JSON de dados operacionais'),
  scope: z.enum(['store', 'admin']).describe('Escopo da análise'),
});

export type AiChatInput = z.infer<typeof AiChatInputSchema>;

const AiChatOutputSchema = z.object({
  text: z.string(),
  error: z.string().nullable(),
});

export type AiChatOutput = z.infer<typeof AiChatOutputSchema>;

export async function askAi(input: AiChatInput): Promise<AiChatOutput> {
  // Validação de segurança no runtime da Server Action
  if (!process.env.GOOGLE_GENAI_API_KEY) {
    console.error('[AI_GATEKEEPER] Chave de API ausente.');
    return { text: '', error: 'CONFIG_MISSING' };
  }

  try {
    const systemPrompt = input.scope === 'admin' 
      ? `Você é o ANALISTA ESTRATÉGICO do VendaFácil. Analise as métricas GLOBAIS. Responda em Markdown.`
      : `Você é o CONSULTOR DE NEGÓCIOS do VendaFácil. Analise estoque, vendas e CMV. Forneça conselhos práticos para aumentar o lucro. Responda em Markdown.`;

    const lastUserMessage = input.messages[input.messages.length - 1]?.content || 'Resuma meus dados.';

    // Execução Genkit 1.x utilizando o modelo configurado globalmente
    const response = await ai.generate({
      system: systemPrompt,
      messages: [
        ...input.messages.slice(0, -1).map(m => ({
          role: m.role as 'user' | 'model',
          content: [{ text: m.content }]
        })),
        {
          role: 'user',
          content: [
            { text: `DADOS DO SISTEMA:\n${input.contextData}\n\n` },
            { text: `PERGUNTA: ${lastUserMessage}` }
          ]
        }
      ]
    });

    return { 
      text: response.text || 'Não consegui processar uma resposta no momento.', 
      error: null 
    };

  } catch (error: any) {
    console.error('[AI_RUNTIME_ERROR]', error);
    return { 
      text: '', 
      error: 'AI_UNAVAILABLE' 
    };
  }
}
