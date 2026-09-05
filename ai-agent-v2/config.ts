import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    throw new Error(`Variable d'environnement manquante: ${name} (voir .env.example)`);
  }
  return v;
}

export const config = {
  mistralApiKey: required('MISTRAL_API_KEY'),
  mistralBaseUrl: process.env.MISTRAL_BASE_URL ?? 'https://api.mistral.ai/v1',
  mistralModel: process.env.MISTRAL_MODEL,
  targetUrl: process.env.TARGET_URL ?? process.env.APP_BASE_URL ?? 'http://localhost:3000',
  slowMoMs: Number(process.env.SLOW_MO_MS ?? 350),
  maxStepsExplorer: Number(process.env.MAX_STEPS_EXPLORER ?? 40),
  maxStepsPerScenario: Number(process.env.MAX_STEPS_PER_SCENARIO ?? 15),
};
