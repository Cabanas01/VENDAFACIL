import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

/**
 * @fileOverview Configuração Central do Genkit v1.x
 * 
 * Configurado para utilizar o plugin oficial do Google AI.
 * A versão da API é gerenciada automaticamente para garantir compatibilidade.
 */

export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  model: 'googleai/gemini-1.5-flash',
});
