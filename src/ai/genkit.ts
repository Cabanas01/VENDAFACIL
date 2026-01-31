import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

/**
 * @fileOverview Configuração Central do Genkit v1.x
 * 
 * Resolve o erro FAILED_PRECONDITION ao mapear todas as variantes possíveis
 * de chaves de API para o Google AI.
 */

export const ai = genkit({
  plugins: [
    googleAI({ 
      apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY 
    })
  ],
  model: 'googleai/gemini-1.5-flash',
});
