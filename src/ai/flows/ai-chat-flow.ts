'use server';

/**
 * @fileOverview Fluxo de IA para análise estratégica do VendaFácil.
 * 
 * Implementado via Genkit v1.x.
 * Nota: Somente funções assíncronas são exportadas para cumprir as regras do Next.js 15.
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
  error: z.string().optional().describe('Código de erro amigável para a UI'),
});

export type AiChatOutput = z.infer<typeof AiChatOutputSchema>;

/**
 * Função principal de execução da IA (Gatekeeper).
 * Valida estritamente a chave GOOGLE_GENAI_API_KEY.
 */
export async function askAi(input: AiChatInput): Promise<AiChatOutput> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  
  if (!apiKey) {
    console.error('[AI_GATEKEEPER] GOOGLE_GENAI_API_KEY ausente no servidor.');
    return { text: '', error: 'API_KEY_MISSING' };
  }

  try {
    const result = await aiChatFlow(input);
    return result;
  } catch (error: any) {
    console.error('[AI_EXECUTION_ERROR]', error);
    return { text: '', error: 'FLOW_EXECUTION_FAILED' };
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

    try {
      const { text } = await ai.generate({
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
        ],
        config: {
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' }
          ]
        }
      });

      if (!text) return { text: '', error: 'EMPTY_RESPONSE' };
      return { text };
    } catch (err: any) {
      console.error('[GENKIT_INTERNAL_ERROR]', err);
      return { text: '', error: err.message || 'GENKIT_ERROR' };
    }
  }
);
