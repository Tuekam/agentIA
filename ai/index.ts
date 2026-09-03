import { runAutonomousQA } from './agents/qa-engineer.agent';

async function main() {
  const userIntention = process.argv[2];

  if (!userIntention) {
    console.error(" Erreur : Veuillez fournir une intention de test.");
    process.exit(1);
  }

  console.log(` Démarrage de l'agent QA autonome pour : "${userIntention}"`);
  
  try {
    await runAutonomousQA(userIntention);
  } catch (error) {
    console.error(" Erreur lors de l'exécution de l'agent :", error);
  }
}

main();