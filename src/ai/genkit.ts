import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

/**
 * @fileOverview Configuração Central do Genkit v1.x
 * 
 * Configurado para o modelo Gemini 1.5 Flash estável via provedor Google AI.
 * O uso do prefixo 'googleai/' é obrigatório para a localização do modelo.
 */

export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  model: 'googleai/gemini-1.5-flash',
});
