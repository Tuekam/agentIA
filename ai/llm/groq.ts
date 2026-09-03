import 'dotenv/config';
import OpenAI from 'openai';

if (!process.env.GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY manquant dans les variables d\'environnement.');
}

export const groqClient = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
  timeout: 60000,
});