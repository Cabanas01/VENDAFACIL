import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

/**
 * @fileOverview Configuração Central do Genkit v1.x
 * 
 * Configurado para o modelo Gemini 1.5 Flash via API v1 estável.
 * O uso de 'googleai/gemini-1.5-flash' garante compatibilidade e performance.
 */

export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  model: 'googleai/gemini-1.5-flash',
});
