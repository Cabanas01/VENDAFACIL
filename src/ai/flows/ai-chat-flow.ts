'use server';

/**
 * @fileOverview Fluxo de IA para análise estratégica do VendaFácil.
 * 
 * Implementação resiliente que valida a configuração antes da execução.
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
  const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    throw new Error('API_KEY_MISSING');
  }

  return aiChatFlow(input);
}

const aiChatFlow = ai.defineFlow(
  {
    name: 'aiChatFlow',
    inputSchema: AiChatInputSchema,
    outputSchema: AiChatOutputSchema,
  },
  async (input) => {
    const systemPrompt = input.scope === 'admin' 
      ? `Você é o ANALISTA ESTRATÉGICO do SaaS VendaFácil. 
         Analise métricas GLOBAIS de faturamento e tenants fornecidas.
         REGRA DE OURO: Responda apenas com base nos DADOS FORNECIDOS.
         Use Markdown.`
      : `Você é o CONSULTOR DE NEGÓCIOS do VendaFácil.
         Foco em: Lucratividade, Gestão de Estoque e Vendas.
         Analise os dados da loja e responda de forma direta.
         REGRA DE OURO: Responda apenas com base nos DADOS FORNECIDOS. Use Markdown.`;

    const history = (input.messages || []).slice(0, -1).map(m => ({
      role: m.role,
      content: [{ text: m.content }]
    }));

    const lastUserMessage = input.messages[input.messages.length - 1]?.content || 'Resuma meus dados.';

    try {
      const { text } = await ai.generate({
        model: 'googleai/gemini-1.5-flash',
        system: systemPrompt,
        config: {
          temperature: 0.7,
        },
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

      if (!text) throw new Error('EMPTY_RESPONSE');

      return { text };
    } catch (err: any) {
      console.error('[AI_FLOW_ERROR]', err);
      throw new Error(`Erro no processamento da IA: ${err.message}`);
    }
  }
);
