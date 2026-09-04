import { groqClient } from '../llm/groq';

async function list() {
  const models = await groqClient.models.list();
  console.log(JSON.stringify(models.data.map(m => m.id), null, 2));
}

list().catch(console.error);
