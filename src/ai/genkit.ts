import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

/**
 * @fileOverview Configuração Central do Genkit v1.x
 * 
 * Configurado para o modelo Gemini 1.5 Flash estável.
 * O uso de 'gemini-1.5-flash' garante compatibilidade com a API v1.
 */

export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  model: 'gemini-1.5-flash',
});
