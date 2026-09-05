import OpenAI from 'openai';
import { setDefaultOpenAIClient, setOpenAIAPI, setTracingDisabled } from '@openai/agents';
import { config } from '../config.js';

/**
 * L'API Mistral est "compatible OpenAI" mais valide le corps des requêtes de
 * façon stricte (pydantic, extra_forbidden) : elle rejette avec une 422
 * toute clé qu'elle ne connaît pas. Le SDK Agents construit ses requêtes au
 * format attendu par la vraie API OpenAI, qui elle tolère des champs en
 * trop — ça inclut par exemple un champ "index" sur les tool_calls d'un
 * message assistant (hérité du format de streaming). C'est un problème
 * documenté, rencontré par plusieurs projets qui branchent un SDK OpenAI
 * sur Mistral, pas un bug de ce projet.
 *
 * On nettoie donc le corps de chaque requête juste avant l'envoi via un
 * `fetch` personnalisé.
 */
function sanitizeMistralBody(raw: string): string {
  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return raw; // pas du JSON (ne devrait pas arriver pour /chat/completions) : on laisse passer tel quel
  }

  const seenToolCallIds = new Set<string>(); // dédoublonnage GLOBAL, à travers tous les messages
  const seenToolResultIds = new Set<string>();

  if (Array.isArray(body.messages)) {
    body.messages = body.messages.filter((msg: any) => {
      // Dédoublonnage symétrique des résultats d'outils (role: "tool") : si un
      // même tool_call_id apparaît deux fois côté assistant (cas ci-dessous),
      // il peut aussi apparaître deux fois côté résultat. On ne garde que le
      // premier pour rester cohérent.
      if (msg && typeof msg === 'object' && msg.role === 'tool' && typeof msg.tool_call_id === 'string') {
        if (seenToolResultIds.has(msg.tool_call_id)) return false;
        seenToolResultIds.add(msg.tool_call_id);
      }
      return true;
    });

    for (const msg of body.messages) {
      if (msg && typeof msg === 'object') {
        delete msg.timestamp;
        delete msg.finish_reason;
        delete msg.index;

        // Le SDK produit parfois "content" sous forme de tableau de blocs
        // (ex: [{ type: "text", text: "...", role: "assistant", tool_calls: [...] }])
        // au lieu d'une simple chaîne. Mistral exige une chaîne (ou null) pour
        // "content" et rejette tout champ "role"/"tool_calls" niché dedans.
        // On aplatit le texte et on remonte les éventuels tool_calls égarés
        // au niveau du message.
        if (Array.isArray(msg.content)) {
          let text = '';
          const hoistedToolCalls: any[] = [];
          for (const part of msg.content) {
            if (part && typeof part === 'object') {
              if (typeof part.text === 'string') text += part.text;
              if (Array.isArray(part.tool_calls)) hoistedToolCalls.push(...part.tool_calls);
            } else if (typeof part === 'string') {
              text += part;
            }
          }
          msg.content = text;
          if (hoistedToolCalls.length > 0) {
            msg.tool_calls = Array.isArray(msg.tool_calls) ? msg.tool_calls.concat(hoistedToolCalls) : hoistedToolCalls;
          }
        }

        if (Array.isArray(msg.tool_calls)) {
          // Dédoublonnage GLOBAL (pas seulement au sein de ce message) : le
          // SDK peut, lors d'une relance interne après un rejet, réinjecter
          // un même tool_call déjà vu dans un message précédent de la même
          // requête. Mistral rejette toute réapparition d'un même id, même
          // dans un message assistant différent.
          msg.tool_calls = msg.tool_calls.filter((toolCall: any) => {
            if (!toolCall || typeof toolCall !== 'object' || !toolCall.id) return true;
            if (seenToolCallIds.has(toolCall.id)) return false;
            seenToolCallIds.add(toolCall.id);
            return true;
          });
          for (const toolCall of msg.tool_calls) {
            if (toolCall && typeof toolCall === 'object') {
              delete toolCall.index;
              delete toolCall.extra_content;
              // Mistral n'attend "name" qu'à l'intérieur de "function", pas au niveau du tool_call
              if (toolCall.function) delete toolCall.name;
            }
          }
        }
      }
    }
  }

  if (body.max_completion_tokens !== undefined) {
    if (body.max_tokens === undefined) body.max_tokens = body.max_completion_tokens;
    delete body.max_completion_tokens;
  }
  delete body.stream_options;

  return JSON.stringify(body);
}

const mistralSanitizingFetch: typeof fetch = async (input, init) => {
  if (init?.body && typeof init.body === 'string') {
    const cleaned = sanitizeMistralBody(init.body);
    if (process.env.MISTRAL_DEBUG === '1') {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      const dir = path.resolve('reports', 'mistral-debug');
      await fs.mkdir(dir, { recursive: true }).catch(() => {});
      const stamp = Date.now();
      await fs.writeFile(path.join(dir, `${stamp}_raw.json`), init.body, 'utf-8').catch(() => {});
      await fs.writeFile(path.join(dir, `${stamp}_cleaned.json`), cleaned, 'utf-8').catch(() => {});
    }
    init = { ...init, body: cleaned };
  }
  return fetch(input as any, init);
};

/**
 * Le SDK Agents d'OpenAI utilise par défaut la Responses API, que Mistral
 * n'implémente pas. On bascule explicitement sur Chat Completions (que
 * l'API Mistral supporte car elle est compatible OpenAI) et on enregistre
 * un client OpenAI pointé sur l'endpoint Mistral.
 */
export function initMistralClient(): void {
  const client = new OpenAI({
    apiKey: config.mistralApiKey,
    baseURL: config.mistralBaseUrl,
    timeout: 60_000,
    fetch: mistralSanitizingFetch,
  });

  setDefaultOpenAIClient(client);
  setOpenAIAPI('chat_completions');
  // Le tracing du SDK envoie des métadonnées à l'API OpenAI (platform.openai.com),
  // ce qui échouerait/serait inutile ici puisqu'on n'a pas de clé OpenAI.
  setTracingDisabled(true);
}