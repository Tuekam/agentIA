# AI Web Testing

Agent QA autonome pour explorer et tester des applications web avec Playwright et un modèle compatible avec l'API Mistral.

Le projet reçoit une intention en langage naturel, découvre l'application cible, construit une liste de scénarios hiérarchisés, exécute ces scénarios dans un navigateur et génère un rapport de test Markdown.

## Fonctionnalités

- Navigation vers une URL locale ou distante.
- Exploration autonome de l'interface.
- Détection des menus, onglets, accordéons et autres éléments déclencheurs.
- Inspection des champs, formulaires, contraintes `required`, erreurs natives et options des listes `<select>`.
- Tests des actions principales : clic, saisie, effacement, sélection, touches clavier et rechargement de page.
- Réinitialisation des filtres avant les vérifications de visibilité.
- Exploration et exécution hiérarchiques.
- Capture d'écran lors du signalement d'une anomalie.
- Génération d'un rapport final avec les scénarios, résultats et bugs détectés.
- Navigateur Chromium visible avec curseur visuel et ralentissement configurable pour suivre les manipulations.

## Architecture

```text
.
├── ai-agent-v2/
│   ├── agents/
│   │   ├── explorerAgent.ts       # Découvre l'interface et enregistre les scénarios
│   │   └── testerAgent.ts          # Exécute les scénarios et signale les anomalies
│   ├── browser/
│   │   ├── session.ts              # Cycle de vie du navigateur et de la page
│   │   ├── cursor.ts               # Curseur visuel dans le navigateur
│   │   └── domSnapshot.ts           # Snapshot DOM, formulaires, options et diffs
│   ├── tools/
│   │   ├── browserTools.ts         # Outils Playwright exposés aux agents
│   │   └── reportingTools.ts       # Enregistrement des scénarios, résultats et bugs
│   ├── state/
│   │   └── registry.ts              # Registres en mémoire de la campagne
│   ├── llm/
│   │   └── mistralClient.ts         # Client Mistral compatible OpenAI
│   ├── report/
│   │   └── writeReport.ts            # Génération des rapports Markdown
│   ├── config.ts                     # Configuration par variables d'environnement
│   └── runner.ts                     # Point d'entrée et orchestration globale
├── reports/                          # Rapports et captures générés
├── tests/                            # Tests Playwright du projet
├── package.json
├── playwright.config.ts
└── tsconfig.json
```

### Flux d'une campagne

```text
Intention utilisateur
        |
        v
Explorateur
  - navigue vers la cible
  - inspecte l'interface
  - explore du niveau global vers les fonctionnalités profondes
  - enregistre les scénarios avec un niveau hiérarchique
        |
        v
Tri des scénarios par niveau
        |
        v
Testeur
  - repart d'un état inspecté
  - exécute les scénarios dans l'ordre
  - recharge la page en cas de blocage
  - vérifie les résultats des actions
  - signale les anomalies
        |
        v
Rapport Markdown dans reports/
```

### Niveaux hiérarchiques

Les scénarios sont exécutés dans cet ordre :

| Niveau | Contenu |
| --- | --- |
| `0` | Accessibilité et inspection de la page racine |
| `1` | Navigation globale et actions principales |
| `2` | Sections, menus, onglets et accordéons |
| `3` | Champs, selects, checkbox et validations isolées |
| `4` | Parcours nominaux complets : création, modification, suppression, recherche, filtre, tri, etc. |
| `5` | Cas négatifs et limites : soumission vide, champs obligatoires, valeurs invalides et états vides |

## Prérequis

- Node.js 20 ou version plus récente recommandée.
- npm ou pnpm.
- Une clé API Mistral.
- Une application web cible accessible depuis la machine d'exécution.
- Un environnement graphique si le navigateur doit rester visible (`headless: false`).

## Installation locale

Cloner le projet puis entrer dans son dossier :

```bash
git clone <URL_DU_DEPOT>
cd ai-web-testing
```

Installer les dépendances :

```bash
npm install
```

Le projet utilise Playwright. Installer les navigateurs nécessaires :

```bash
npx playwright install chromium
```

Le gestionnaire pnpm peut également être utilisé si votre environnement est configuré pour cela :

```bash
pnpm install
pnpm exec playwright install chromium
```

## Configuration

Créer un fichier `.env` à la racine

```env
MISTRAL_API_KEY=your_mistral_api_key
MISTRAL_BASE_URL=https://api.mistral.ai/v1
MISTRAL_MODEL=ministral-8b-latest
TARGET_URL=http://localhost:3000
SLOW_MO_MS=350
MAX_STEPS_EXPLORER=40
MAX_STEPS_PER_SCENARIO=15
```

### Variables disponibles

| Variable | Obligatoire | Valeur par défaut | Description |
| --- | --- | --- | --- |
| `MISTRAL_API_KEY` | Oui | Aucune | Clé API Mistral |
| `MISTRAL_BASE_URL` | Non | `https://api.mistral.ai/v1` | Endpoint compatible OpenAI/Mistral |
| `MISTRAL_MODEL` | Non | Selon le fournisseur | Modèle utilisé par les agents |
| `TARGET_URL` | Non | `http://localhost:3000` | URL utilisée si aucune URL n'est présente dans l'intention |
| `APP_BASE_URL` | Non | Aucune | Alternative à `TARGET_URL` |
| `SLOW_MO_MS` | Non | `350` | Délai Playwright entre les actions |
| `MAX_STEPS_EXPLORER` | Non | `40` | Nombre maximal de tours d'exploration |
| `MAX_STEPS_PER_SCENARIO` | Non | `15` | Nombre maximal de tours par scénario |

L'URL présente explicitement dans l'intention utilisateur est prioritaire sur `TARGET_URL`.

## Lancer une campagne

Avec une application locale déjà démarrée :

```bash
npx tsx ai-agent-v2/runner.ts "Teste cette application entièrement http://localhost:3000"
```

Avec une application distante :

```bash
npx tsx ai-agent-v2/runner.ts "Teste entièrement https://example.com"
```

Pour une campagne ciblée :

```bash
npx tsx ai-agent-v2/runner.ts "Connecte-toi à https://example.com/admin, vérifie la navigation et teste la création d'une nouvelle expédition"
```

Pour suivre plus facilement les manipulations dans le navigateur :

```powershell
npx tsx ai-agent-v2/runner.ts "Teste cette application entièrement http://localhost:3000"
```

Le navigateur Chromium s'ouvre dans une fenêtre séparée. Le curseur rouge indique la zone ciblée par l'agent.

## Rapports et captures

À la fin d'une campagne, le runner écrit un rapport Markdown dans :

```text
reports/rapport_<timestamp>.md
```

Les captures utilisées comme preuves sont enregistrées dans :

```text
reports/screenshots/
```

Les rapports et captures peuvent contenir des données sensibles de l'application testée. Vérifiez leur contenu avant de les publier ou de les inclure dans un artefact CI.

## Tests et validation

Vérifier les diagnostics TypeScript :

```bash
npx tsc --noEmit
```

Lancer les tests Playwright :

```bash
npx playwright test
```

Afficher le rapport Playwright :

```bash
npx playwright show-report
```


## Limites actuelles
