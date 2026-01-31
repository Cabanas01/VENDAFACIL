import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import { config } from 'dotenv';

// Garante que variáveis de ambiente do .env sejam carregadas no servidor
config();

/**
 * @fileOverview Configuração Central do Genkit v1.x
 * 
 * Resolve o erro FAILED_PRECONDITION ao mapear todas as variantes possíveis
 * de chaves de API para o Google AI.
 */

const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.warn('[GENKIT] Aviso: Nenhuma chave de API (GOOGLE_GENAI_API_KEY ou GEMINI_API_KEY) foi detectada no ambiente.');
}

export const ai = genkit({
  plugins: [
    googleAI({ apiKey })
  ],
  model: 'googleai/gemini-1.5-flash',
});
