import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import { config } from 'dotenv';

config();

/**
 * @fileOverview Configuração Central do Genkit v1.x
 * 
 * Utiliza o plugin estável do Google AI com tratamento dinâmico de chaves.
 */

const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('[GENKIT] Aviso: Nenhuma chave de API (GOOGLE_GENAI_API_KEY ou GEMINI_API_KEY) foi detectada no ambiente.');
}

export const ai = genkit({
  plugins: [googleAI({ apiKey })],
  model: 'googleai/gemini-1.5-flash', // Utilizando modelo estável para evitar erros de versão
});
