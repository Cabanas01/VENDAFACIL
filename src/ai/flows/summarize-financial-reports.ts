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
  input: {schema: SummarizeFinancialReportsInputSchema},
  output: {schema: SummarizeFinancialReportsOutputSchema},
  prompt: `Você é um analista financeiro sênior. Sumarize os dados abaixo em Markdown:

Dados:
{{{financialReportData}}}

Forneça:
1. Resumo Conciso
2. Tendências Identificadas
3. Oportunidades de Lucro
4. Riscos Detectados`,
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
