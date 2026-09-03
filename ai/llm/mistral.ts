import OpenAI from 'openai';
import 'dotenv/config';

// On instancie le client OpenAI en le redirigeant vers l'API de Mistral
export const mistralClient = new OpenAI({
  apiKey: process.env.MISTRAL_API_KEY,
  baseURL: 'https://api.mistral.ai/v1',
});