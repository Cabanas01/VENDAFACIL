'use server';

/**
 * @fileOverview Summarizes financial reports into short blurbs for extracting action items, 
 * assessing data and calling out trends, opportunities, and risks in store data.
 *
 * - summarizeFinancialReports - A function that handles the summarization of financial reports.
 * - SummarizeFinancialReportsInput - The input type for the summarizeFinancialReports function.
 * - SummarizeFinancialReportsOutput - The return type for the summarizeFinancialReports function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeFinancialReportsInputSchema = z.object({
  financialReportData: z.string().describe('The financial report data to summarize.'),
});

export type SummarizeFinancialReportsInput = z.infer<typeof SummarizeFinancialReportsInputSchema>;

const SummarizeFinancialReportsOutputSchema = z.object({
  summary: z.string().describe('A summarized blurb of the financial report data.'),
  trends: z.string().describe('Identified trends in the financial report data.'),
  opportunities: z.string().describe('Identified opportunities in the financial report data.'),
  risks: z.string().describe('Identified risks in the financial report data.'),
});

export type SummarizeFinancialReportsOutput = z.infer<typeof SummarizeFinancialReportsOutputSchema>;

export async function summarizeFinancialReports(input: SummarizeFinancialReportsInput): Promise<SummarizeFinancialReportsOutput> {
  return summarizeFinancialReportsFlow(input);
}

const summarizeFinancialReportsPrompt = ai.definePrompt({
  name: 'summarizeFinancialReportsPrompt',
  input: {schema: SummarizeFinancialReportsInputSchema},
  output: {schema: SummarizeFinancialReportsOutputSchema},
  prompt: `You are an expert financial analyst tasked with summarizing financial reports for store owners. Analyze the provided financial report data and provide:

- A short, concise summary of the report.
- Identify any significant trends.
- Highlight potential opportunities for growth or improvement.
- Point out any risks or areas of concern.

Financial Report Data:
{{{financialReportData}}}

Summary:
Trends:
Opportunities:
Risks:`,
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
