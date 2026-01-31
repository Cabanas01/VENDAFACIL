'use server';

/**
 * @fileOverview Fluxo de IA para análise estratégica do VendaFácil.
 * 
 * Implementação robusta para o Genkit v1.x focada em análise passiva de dados comerciais.
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
         NÃO sugira ações destrutivas. Use Markdown.`
      : `Você é o CONSULTOR DE NEGÓCIOS do VendaFácil.
         Foco em: Lucratividade (CMV), Gestão de Estoque e Vendas.
         Analise os dados da loja e responda de forma consultiva e direta.
         REGRA DE OURO: Responda apenas com base nos DADOS FORNECIDOS. Use Markdown.`;

    // Filtramos o histórico para garantir a estrutura correta do Genkit 1.x
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
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
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

      if (!text) {
        throw new Error('A IA não gerou uma resposta textual válida.');
      }

      return { text };
    } catch (err: any) {
      console.error('[AI_FLOW_CRITICAL_ERROR]', err);
      throw new Error(`Falha técnica na análise: ${err.message}`);
    }
  }
);
