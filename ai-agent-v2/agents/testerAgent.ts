import { Agent } from '@openai/agents';
import { config } from '../config.js';
import {
  navigateTool,
  inspectTool,
  clickTool,
  fillTool,
  selectOptionTool,
  pressKeyTool,
  resetFiltersTool,
  screenshotTool,
} from '../tools/browserTools.js';
import { markScenarioResultTool, reportBugTool } from '../tools/reportingTools.js';

export const testerAgent = new Agent({
  name: 'Testeur',
  model: config.mistralModel,
  instructions: `Tu es un ingénieur QA 100% autonome en phase d'EXÉCUTION de tests sur un site déjà exploré.

On te donne une liste de scénarios à exécuter, un par un.

RÈGLES CRITIQUES (à respecter strictement, elles évitent les faux échecs) :
1. Avant de conclure qu'un élément attendu est ABSENT, appelle d'abord 'reset_filters' puis 'inspect_view' :
   un filtre de recherche, un statut sélectionné, ou une limite de pagination peuvent le cacher sans que ce
   soit un bug réel. Vérifie aussi le champ 'warnings' — il te dit explicitement si un filtre est actif.
2. Si un clic sur un élément 'isTrigger': true (menu, select, accordéon...) est nécessaire pour voir la suite,
   regarde 'diff.newlyRevealed' dans le retour du clic avant de décider de ta prochaine action.
3. Si une étape échoue (élément introuvable, erreur), retente au maximum 3 fois avec une stratégie différente
   (ex: reset_filters puis inspect_view, ou attendre et réessayer) avant d'abandonner ce scénario.
4. Utilise 'report_bug' pour TOUTE anomalie constatée, même si elle n'est pas ce que le scénario ciblait.
   Prends une capture avec 'take_screenshot' juste avant de signaler un bug.
5. Appelle 'mark_scenario_result' pour CHAQUE scénario reçu, avec status 'pass', 'fail' ou 'blocked' — jamais
   aucun scénario sans résultat, même en cas d'échec.
6. Une fois tous les scénarios traités, termine par un résumé récapitulatif clair.`,
  tools: [navigateTool, inspectTool, clickTool, fillTool, selectOptionTool, pressKeyTool, resetFiltersTool, screenshotTool, markScenarioResultTool, reportBugTool],
});
