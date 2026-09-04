export const agentTools = [
  {
    type: 'function',
    function: {
      name: 'navigate_to',
      description: "Navigue vers une URL.",
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
      name: 'inspect_view',
      description: "Regarde l'etat actuel du site (URL et elements visibles).",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'click_button',
      description: "Clique sur un bouton ou un lien via un selecteur CSS.",
      parameters: {
        type: 'object',
        properties: { selector: { type: 'string', description: "Selecteur CSS (ex: 'button', '.delete-btn')" } },
        required: ['selector'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'click_text',
      description: "Clique sur un element (bouton, lien, span) contenant un texte precis. Tres efficace pour les modales.",
      parameters: {
        type: 'object',
        properties: { text: { type: 'string', description: "Le texte exact ou partiel sur lequel cliquer (ex: 'Confirmer')" } },
        required: ['text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'wait_for_text',
      description: "Attend qu'un texte specifique apparaisse sur la page (ex: attend l'ouverture d'une modale).",
      parameters: {
        type: 'object',
        properties: { text: { type: 'string' } },
        required: ['text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fill_input',
      description: "Saisit du texte dans un champ.",
      parameters: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: "Selecteur CSS (ex: 'input[placeholder=\"...\"]')" },
          value: { type: 'string' }
        },
        required: ['selector', 'value'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'take_screenshot',
      description: "Prend une capture d'ecran de la page actuelle pour le debug.",
      parameters: {
        type: 'object',
        properties: { name: { type: 'string', description: "Nom du fichier image" } },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'finish_test',
      description: "Termine la session quand l'intention est remplie.",
      parameters: {
        type: 'object',
        properties: { summary: { type: 'string', description: "Resume de ce qui a ete fait." } },
        required: ['summary'],
      },
    },
  },
];
