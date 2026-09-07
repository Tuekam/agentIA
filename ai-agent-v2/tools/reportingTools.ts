import { tool } from '@openai/agents';
import { z } from 'zod';
import { scenarioRegistry, resultsRegistry, bugsRegistry } from '../state/registry.js';

export const recordScenarioTool = tool({
  name: 'record_scenario',
  description:
    "À utiliser pendant l'exploration : enregistre un scénario de test que tu as identifié comme pertinent " +
    "à partir de ce que tu as découvert sur le site (formulaire vu, filtre vu, bouton de suppression vu, etc.). " +
    'Appelle cet outil autant de fois que nécessaire pour couvrir les fonctionnalités principales du site.',
  parameters: z.object({
    name: z.string().describe('Nom court du scénario'),
    goal: z.string().describe('Ce que ce scénario doit vérifier, en une phrase'),
    steps: z.array(z.string()).describe('Étapes suggérées en langage naturel, dans l’ordre'),
    level: z.number().int().min(0).max(5).describe('Niveau hiérarchique : 0 page, 1 navigation, 2 sections, 3 contrôles, 4 parcours nominaux, 5 cas négatifs'),
  }),
  execute: async (input) => {
    scenarioRegistry.push(input);
    return { recorded: true, totalScenarios: scenarioRegistry.length };
  },
});

export const markScenarioResultTool = tool({
  name: 'mark_scenario_result',
  description:
    "À utiliser pendant l'exécution des tests : enregistre le résultat d'un scénario une fois que tu as fini " +
    'de l’exécuter. Appelle cet outil UNE FOIS PAR SCÉNARIO reçu, même en cas d’échec ou de blocage.',
  parameters: z.object({
    name: z.string().describe('Nom du scénario (doit correspondre à celui reçu)'),
    status: z.enum(['pass', 'fail', 'blocked']),
    notes: z.string().describe('Explique ce qui a été vérifié, ou pourquoi ça a échoué/bloqué'),
  }),
  execute: async (input) => {
    resultsRegistry.push(input);
    return { recorded: true };
  },
});

export const reportBugTool = tool({
  name: 'report_bug',
  description:
    "Signale une anomalie constatée pendant le test (même si ce n'est pas ce que le scénario en cours cherchait " +
    'à vérifier). Pense à prendre une capture avec take_screenshot avant, et référence son nom ici.',
  parameters: z.object({
    title: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    description: z.string(),
    screenshotPath: z.string().optional().describe("Chemin retourné par take_screenshot, si disponible"),
  }),
  execute: async (input) => {
    bugsRegistry.push(input);
    return { recorded: true };
  },
});
