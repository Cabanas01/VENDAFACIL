'use server';

/**
 * @fileOverview Fluxo de IA para análise estratégica do VendaFácil.
 * 
 * Implementado via Genkit v1.x API.
 * Nota: Exporta apenas funções assíncronas para compatibilidade com Next.js 15 Server Actions.
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
  error: z.string().nullable().describe('Código de erro amigável para a UI'),
});

export type AiChatOutput = z.infer<typeof AiChatOutputSchema>;

/**
 * Função principal de execução da IA (Server Action).
 * Valida a infraestrutura e executa a geração de conteúdo via Genkit.
 */
export async function askAi(input: AiChatInput): Promise<AiChatOutput> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  
  if (!apiKey) {
    console.error('[AI_GATEKEEPER] GOOGLE_GENAI_API_KEY ausente no servidor.');
    return { text: '', error: 'CONFIG_MISSING' };
  }

  try {
    const systemPrompt = input.scope === 'admin' 
      ? `Você é o ANALISTA ESTRATÉGICO do SaaS VendaFácil. Analise as métricas GLOBAIS fornecidas. Responda de forma executiva em Markdown, focando em saúde do ecossistema e crescimento.`
      : `Você é o CONSULTOR DE NEGÓCIOS do VendaFácil. Analise os dados operacionais da loja (estoque, vendas, CMV) e forneça conselhos práticos para aumentar o lucro. Responda em Markdown.`;

    const lastUserMessage = input.messages[input.messages.length - 1]?.content || 'Resuma meus dados.';

    // Genkit 1.x generate call
    const response = await ai.generate({
      system: systemPrompt,
      messages: [
        // Histórico anterior (convertido para formato Genkit)
        ...input.messages.slice(0, -1).map(m => ({
          role: m.role as 'user' | 'model',
          content: [{ text: m.content }]
        })),
        // Mensagem atual com injeção de contexto de dados
        {
          role: 'user',
          content: [
            { text: `CONTEXTO DE DADOS ATUALIZADO:\n${input.contextData}\n\n` },
            { text: `PERGUNTA DO USUÁRIO: ${lastUserMessage}` }
          ]
        }
      ]
    });

    if (!response.text) {
      return { text: '', error: 'EMPTY_RESPONSE' };
    }

    return { 
      text: response.text, 
      error: null 
    };

  } catch (error: any) {
    console.error('[GENKIT_EXECUTION_ERROR]', error);
    return { 
      text: '', 
      error: error.message || 'AI_UNAVAILABLE' 
    };
  }
}
