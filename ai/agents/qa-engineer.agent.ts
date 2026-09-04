import { mistralClient } from '../llm/mistral';
import { agentTools } from '../tools/definitions';
import {
  captureState, closeBrowser, navigateTo, interactWithElement, takeScreenshot
} from '../tools/browser-manager';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runAutonomousQA(intention: string) {
  let messages: any[] = [
    {
      role: 'system',
      content: `Tu es un agent QA 100% autonome. Tu découvres le site, crées tes scénarios et les executes.
TON BUT : Explorer et tester l'application selon l'intention de l'utilisateur.

CYCLE DE TRAVAIL :
1. DECOUVERTE : Navigue sur l'URL et utilise 'inspect_view' pour comprendre la page.
2. PLAN : Annonce ton plan d'action (ex: "Je vais ajouter une tache, la modifier puis la supprimer").
3. EXECUTION : Fais une action a la fois. Avant chaque action, explique ta pensée.
4. ANALYSE : Si une action echoue, analyse l'erreur reçue et propose une solution alternative.
5. RAPPORT : Termine avec 'finish_test' en resumant tes succès et echecs.

RÈGLES :
- Utilise uniquement les IDs fournis par 'inspect_view'.
- Ne reste pas bloqué : si un bouton ne marche pas, essaie une autre methode ou un autre element.`,
    },
    { role: 'user', content: intention },
  ];

  let isComplete = false;
  let steps = 25;

  while (!isComplete && steps > 0) {
    steps--;
    try {
      const response = await mistralClient.chat.completions.create({
        model: 'open-mistral-7b',
        messages,
        tools: agentTools as any,
      });

      const message = response.choices[0].message;
      if (message.content) console.log(`\n[PENSEE]: ${message.content}`);
      messages.push(message);

      if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          if (toolCall.type !== 'function') continue;

          const name = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);
          let result = '';

          console.log(`[ACTION]: ${name}`);

          if (name === 'navigate_to') result = JSON.stringify(await navigateTo(args.url));
          else if (name === 'inspect_view') result = JSON.stringify(await captureState());
          else if (name === 'interact_with_element') result = JSON.stringify(await interactWithElement(args.id, args.action, args.value));
          else if (name === 'take_screenshot') result = JSON.stringify(await takeScreenshot(args.name));
          else if (name === 'finish_test') {
            console.log("\n--- RAPPORT FINAL ---\n" + args.summary);
            isComplete = true;
            result = "Terminé";
          }

          messages.push({ role: 'tool', name, content: result, tool_call_id: toolCall.id });
        }
      } else if (!message.content) {
        isComplete = true;
      }
    } catch (error: any) {
      if (error.status === 429) {
        console.log("Attente quota...");
        await sleep(15000);
      } else {
        console.error("Erreur:", error.message);
        isComplete = true;
      }
    }
  }
  await sleep(2000);
  await closeBrowser();
}
