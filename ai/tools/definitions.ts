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
      description: "Regarde l'etat actuel du site. Retourne les elements avec leur ID et leurs coordonnees (x, y).",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'interact_with_element',
      description: "Interagit avec un element via son ID (click technique, fill, press).",
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          action: { type: 'string', enum: ['click', 'fill', 'press'] },
          value: { type: 'string' }
        },
        required: ['id', 'action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mouse_click',
      description: "Effectue un clic souris REEL aux coordonnees x et y. Utile si le clic par ID ne fonctionne pas.",
      parameters: {
        type: 'object',
        properties: {
          x: { type: 'number' },
          y: { type: 'number' }
        },
        required: ['x', 'y'],
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
