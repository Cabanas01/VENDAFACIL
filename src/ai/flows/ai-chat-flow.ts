'use server';

/**
 * @fileOverview Fluxo de Chat de IA (SaaS Advisor)
 * 
 * Implementado via Genkit v1.x.
 * A instrução de sistema é passada como mensagem para evitar erro 400 na API v1.
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
  if (!process.env.GOOGLE_GENAI_API_KEY) {
    console.error('[AI_GATEKEEPER] Chave de API GOOGLE_GENAI_API_KEY ausente.');
    return { text: '', error: 'CONFIG_MISSING' };
  }

  try {
    const systemPrompt = input.scope === 'admin' 
      ? `Você é o ANALISTA ESTRATÉGICO do VendaFácil. Analise as métricas GLOBAIS do SaaS. Responda em Markdown de forma executiva.`
      : `Você é o CONSULTOR DE NEGÓCIOS do VendaFácil. Analise estoque, vendas e lucro bruto. Forneça conselhos práticos para aumentar a eficiência da loja. Responda em Markdown.`;

    const lastUserMessage = input.messages[input.messages.length - 1]?.content || 'Resuma meus dados.';

    // Construção de mensagens usando role: system dentro do array de conteúdos.
    // Isso é mais compatível que o parâmetro systemInstruction no topo do payload.
    const response = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      messages: [
        { role: 'system', content: [{ text: systemPrompt }] },
        ...input.messages.slice(0, -1).map(m => ({
          role: m.role as 'user' | 'model',
          content: [{ text: m.content }]
        })),
        {
          role: 'user',
          content: [
            { text: `DADOS ATUAIS DO SISTEMA:\n${input.contextData}\n\nPERGUNTA DO USUÁRIO: ${lastUserMessage}` }
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
