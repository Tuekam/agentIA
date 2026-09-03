export const agentTools = [
  {
    type: 'function',
    function: {
      name: 'inspect_page',
      description: "Retourne les elements interactifs (boutons, inputs) visibles sur la page.",
      parameters: {
        type: 'object',
        properties: { url: { type: 'string' } },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_test',
      description: "Ecrit le code Playwright complet (.spec.ts) dans un fichier unique.",
      parameters: {
        type: 'object',
        properties: { code: { type: 'string' } },
        required: ['code'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'execute_test',
      description: "Lance le test Playwright et retourne le resultat.",
      parameters: { type: 'object', properties: {} },
    },
  },
];
