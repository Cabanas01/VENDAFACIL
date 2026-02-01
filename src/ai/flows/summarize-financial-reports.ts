'use server';

/**
 * @fileOverview Sumarização de Relatórios Financeiros via Genkit 1.x
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeFinancialReportsInputSchema = z.object({
  financialReportData: z.string().describe('Dados do relatório financeiro para sumarização.'),
});

export type SummarizeFinancialReportsInput = z.infer<typeof SummarizeFinancialReportsInputSchema>;

const SummarizeFinancialReportsOutputSchema = z.object({
  summary: z.string(),
  trends: z.string(),
  opportunities: z.string(),
  risks: z.string(),
});

export type SummarizeFinancialReportsOutput = z.infer<typeof SummarizeFinancialReportsOutputSchema>;

export async function summarizeFinancialReports(input: SummarizeFinancialReportsInput): Promise<SummarizeFinancialReportsOutput> {
  return summarizeFinancialReportsFlow(input);
}

const summarizeFinancialReportsPrompt = ai.definePrompt({
  name: 'summarizeFinancialReportsPrompt',
  model: 'gemini-1.5-flash',
  input: {schema: SummarizeFinancialReportsInputSchema},
  output: {schema: SummarizeFinancialReportsOutputSchema},
  prompt: `Você é um analista financeiro sênior especializado em varejo. Analise os dados abaixo e forneça uma visão estratégica em Markdown:

DADOS DO RELATÓRIO:
{{{financialReportData}}}

Sua resposta deve conter:
1. Resumo Executivo (o que aconteceu no período)
2. Tendências Identificadas (padrões de consumo ou gastos)
3. Oportunidades de Lucro (onde a loja pode ganhar mais)
4. Riscos Detectados (estoque parado, margem baixa, etc)`,
});

const summarizeFinancialReportsFlow = ai.defineFlow(
  {
    name: 'summarizeFinancialReportsFlow',
    inputSchema: SummarizeFinancialReportsInputSchema,
    outputSchema: SummarizeFinancialReportsOutputSchema,
  },
  async input => {
    const {output} = await summarizeFinancialReportsPrompt(input);
    return output!;
  }
);
