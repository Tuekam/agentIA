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
      description: "Retourne les elements de la page avec leurs IDs pour l'interaction.",
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
      name: 'take_screenshot',
      description: "Prend une photo de l'ecran pour analyse visuelle.",
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
      description: "Termine le test et fournit un rapport complet.",
      parameters: {
        type: 'object',
        properties: { summary: { type: 'string', description: "Resume des actions et resultats." } },
        required: ['summary'],
      },
    },
  },
];
