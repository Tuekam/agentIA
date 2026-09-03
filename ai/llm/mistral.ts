import 'dotenv/config';
import OpenAI from 'openai';

if (!process.env.MISTRAL_API_KEY) {
  throw new Error('MISTRAL_API_KEY manquante dans le fichier .env');
}

export const mistralClient = new OpenAI({
  apiKey: process.env.MISTRAL_API_KEY,
  baseURL: 'https://api.mistral.ai/v1',
  timeout: 60000, // Timeout allongé à 60s pour éviter les ConnectTimeoutError
});