import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

/**
 * @fileOverview Configuração Central do Genkit v1.x
 * 
 * Exclusivamente configurado para o modelo Gemini 1.5 Flash via API v1.
 * Esta configuração evita o uso do endpoint v1beta e elimina erros 404.
 */

export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  model: 'googleai/gemini-1.5-flash',
});
