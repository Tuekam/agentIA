export const agentTools = [
  {
    type: 'function',
    function: {
      name: 'get_project_structure',
      description: "Renvoie l'arborescence réelle des fichiers de test. À utiliser pour connaître les chemins d'importation.",
      parameters: {
        type: 'object',
        properties: {
          directory: { type: 'string', description: 'Dossier à inspecter (défaut "tests")' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'inspect_dom',
      description: "Capture le HTML actuel de la page. Cette capture conserve l'état des actions précédentes (session partagée).",
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'take_screenshot',
      description: "Prend une capture d'écran de la page actuelle. Utile pour débugger visuellement les erreurs.",
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          name: { type: 'string', description: "Nom du fichier (ex: 'erreur-suppression')" },
        },
        required: ['url', 'name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'evaluate_dom_action',
      description: "Exécute des actions réelles (fill, click) sur la page en cours. L'état est conservé.",
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          actions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['fill', 'click', 'press'] },
                selector: { type: 'string' },
                value: { type: 'string' },
              },
              required: ['type', 'selector'],
            },
          },
        },
        required: ['url', 'actions'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_test_files',
      description: 'Écrit les fichiers de test Playwright (POM et Spec).',
      parameters: {
        type: 'object',
        properties: {
          pageObjectCode: { type: 'string' },
          specCode: { type: 'string' },
        },
        required: ['pageObjectCode', 'specCode'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_playwright_test',
      description: 'Exécute le test généré.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
];