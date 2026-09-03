export const agentTools = [
  {
    type: 'function',
    function: {
      name: 'get_project_structure',
      description:
        "Renvoie l'arborescence réelle des fichiers de test TypeScript/JavaScript dans le projet. Utilise cet outil OBLIGATOIREMENT avant d'écrire des fichiers pour connaître les chemins d'importation exacts.",
      parameters: {
        type: 'object',
        properties: {
          directory: {
            type: 'string',
            description: 'Dossier à inspecter (par défaut "tests")',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'inspect_dom',
      description: "Inspecte le DOM initial d'une URL.",
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
      name: 'evaluate_dom_action',
      description:
        "Simule l'ajout/suppression d'un élément sur la page et RENVOIE LES LOCATORS PLAYWRIGHT EXACTS à utiliser. Exécute OBLIGATOIREMENT cet outil avant write_test_files pour savoir comment cibler l'élément créé.",
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
                selector: {
                  type: 'string',
                  description: 'Ex: input[placeholder="..."], button',
                },
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
      description:
        'Écrit ou met à jour les fichiers de test Playwright (POM et Spec) sur le disque.',
      parameters: {
        type: 'object',
        properties: {
          pageObjectCode: { type: 'string' },
          specCode: { type: 'string' },
          pageObjectPath: {
            type: 'string',
            description: 'Chemin relatif exact du fichier Page Object',
          },
          specPath: {
            type: 'string',
            description: 'Chemin relatif exact du fichier Spec',
          },
        },
        required: ['pageObjectCode', 'specCode'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_playwright_test',
      description: 'Exécute la suite de tests Playwright.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
];