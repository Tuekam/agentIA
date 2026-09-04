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
      description: "Regarde l'etat actuel du site (URL, modales et elements numerotés).",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'interact_with_element',
      description: "Interagit avec un element via son ID (click, fill, press).",
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          action: { type: 'string', enum: ['click', 'fill', 'press'] },
          value: { type: 'string', description: "Texte a saisir ou touche (ex: 'Enter')" }
        },
        required: ['id', 'action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'select_option',
      description: "Choisis une option dans un menu deroulant (select) via son ID.",
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          value: { type: 'string', description: "Valeur de l'option (ex: 'true', 'createdAt')" }
        },
        required: ['id', 'value'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'press_key',
      description: "Envoie une touche clavier (ArrowDown, ArrowUp, Enter, Escape).",
      parameters: {
        type: 'object',
        properties: { key: { type: 'string' } },
        required: ['key'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'take_screenshot',
      description: "Prend une capture d'ecran pour le debug visuel.",
      parameters: {
        type: 'object',
        properties: { name: { type: 'string' } },
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
        properties: { summary: { type: 'string' } },
        required: ['summary'],
      },
    },
  },
];
