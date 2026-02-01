import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

/**
 * @fileOverview Configuração Central do Genkit v1.x
 * 
 * Sincronizado para usar o motor estável googleAI.
 * Não definimos o modelo global para forçar a especificação em cada chamada,
 * evitando fallbacks para modelos inexistentes.
 */

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    }),
  ],
});
