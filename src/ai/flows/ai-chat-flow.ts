'use server';

/**
 * @fileOverview Fluxo de IA para análise estratégica do VendaFácil.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const AiChatInputSchema = z.object({
  messages: z.array(MessageSchema),
  contextData: z.string().describe('Snapshot JSON de dados reais do sistema para análise'),
  scope: z.enum(['store', 'admin']).describe('Define se a IA analisa uma loja ou o sistema global'),
});

export type AiChatInput = z.infer<typeof AiChatInputSchema>;

const AiChatOutputSchema = z.object({
  text: z.string().describe('Resposta da IA formatada em Markdown'),
});

export type AiChatOutput = z.infer<typeof AiChatOutputSchema>;

export async function askAi(input: AiChatInput): Promise<AiChatOutput> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY || 
                 process.env.GEMINI_API_KEY || 
                 process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    throw new Error('API_KEY_MISSING');
  }

  try {
    return await aiChatFlow(input);
  } catch (error: any) {
    console.error('[AI_FLOW_EXECUTION_ERROR]', error);
    throw error;
  }
}

const aiChatFlow = ai.defineFlow(
  {
    name: 'aiChatFlow',
    inputSchema: AiChatInputSchema,
    outputSchema: AiChatOutputSchema,
  },
  async (input) => {
    const systemPrompt = input.scope === 'admin' 
      ? `Você é o ANALISTA ESTRATÉGICO do SaaS VendaFácil. Analise métricas GLOBAIS fornecidas. Responda apenas com base nos DADOS FORNECIDOS em Markdown.`
      : `Você é o CONSULTOR DE NEGÓCIOS do VendaFácil. Analise os dados da loja (estoque, vendas, CMV) e responda de forma direta em Markdown.`;

    const history = (input.messages || []).slice(0, -1).map(m => ({
      role: m.role,
      content: [{ text: m.content }]
    }));

    const lastUserMessage = input.messages[input.messages.length - 1]?.content || 'Resuma meus dados.';

    const { text } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      system: systemPrompt,
      messages: [
        ...history,
        {
          role: 'user',
          content: [
            { text: `DADOS DA OPERAÇÃO:\n${input.contextData}\n\n` },
            { text: `PERGUNTA DO USUÁRIO: ${lastUserMessage}` }
          ]
        }
      ]
    });

    if (!text) throw new Error('A IA retornou uma resposta vazia.');

    return { text };
  }
);
