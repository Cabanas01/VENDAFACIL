import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

/**
 * @fileOverview Configuração Central do Genkit v1.x
 * 
 * Forçamos a apiVersion 'v1' para garantir estabilidade e evitar o endpoint v1beta
 * que apresenta instabilidade na localização do modelo Gemini 1.5 Flash.
 */

export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: 'v1',
    }),
  ],
  model: 'googleai/gemini-1.5-flash',
});
