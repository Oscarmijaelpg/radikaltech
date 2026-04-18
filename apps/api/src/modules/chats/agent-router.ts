import { env } from '../../config/env.js';
import { LLM_MODELS, PROVIDER_URLS } from '../../config/providers.js';
import { AGENTS } from './agents.js';

export interface RouteInput {
  message: string;
  availableAgents: string[];
}

export interface RouteDecision {
  agentId: string;
  confidence: number;
  reason: string;
}

/**
 * Classifier that decides which of the available agents should answer the
 * incoming user message. Returns null when the model is unreachable or the
 * output is unparseable so the caller can fall back to a default.
 *
 * Implementation: single non-streaming call to OpenRouter (gpt-4o-mini) with
 * JSON mode. If no provider is configured, returns null.
 */
export class AgentRouter {
  async route(input: RouteInput): Promise<RouteDecision | null> {
    const ids = input.availableAgents.filter((id) => AGENTS.some((a) => a.id === id));
    if (ids.length === 0) return null;
    if (ids.length === 1) {
      return { agentId: ids[0]!, confidence: 1, reason: 'Único agente disponible' };
    }

    const agentList = ids
      .map((id) => {
        const a = AGENTS.find((x) => x.id === id)!;
        return `- ${a.id} (${a.name} - ${a.role})`;
      })
      .join('\n');

    const systemPrompt = [
      'Eres un clasificador de intención para un equipo de agentes de marketing de marca.',
      'Dada una pregunta del usuario, elige UN solo agente (del listado) que mejor responda según expertise:',
      '- ankor: identidad, misión, visión, valores, esencia, posicionamiento',
      '- sira: análisis de mercado, competencia, patrones, oportunidades',
      '- nexo: creatividad, ideas de campañas, copies, hooks, contenido',
      '- kronos: estrategia, planificación 6-12m, priorización, objetivos',
      '- indexa: métricas, KPIs, dashboards, A/B tests, analítica',
      '',
      'Responde SOLO un JSON compacto:',
      '{"agent_id":"<id>","confidence":0-1,"reason":"<1 linea en español>"}',
    ].join('\n');

    const userPrompt = `Agentes disponibles:\n${agentList}\n\nMensaje del usuario:\n"""${input.message.slice(0, 1500)}"""\n\nResponde solo el JSON.`;

    const body: {
      model: string;
      temperature: number;
      response_format: { type: 'json_object' };
      messages: Array<{ role: 'system' | 'user'; content: string }>;
    } = {
      model: LLM_MODELS.chat.openrouter,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    };

    try {
      let url: string;
      let apiKey: string | undefined;
      const extraHeaders: Record<string, string> = {};
      if (env.OPENROUTER_API_KEY) {
        url = PROVIDER_URLS.openrouter.chatCompletions;
        apiKey = env.OPENROUTER_API_KEY;
        extraHeaders['HTTP-Referer'] = env.WEB_URL;
        extraHeaders['X-Title'] = 'Radikal';
      } else if (env.OPENAI_API_KEY) {
        url = PROVIDER_URLS.openai.chatCompletions;
        apiKey = env.OPENAI_API_KEY;
        body.model = LLM_MODELS.chat.openai;
      } else {
        return null;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          ...extraHeaders,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        console.warn('[agent-router] upstream', res.status);
        return null;
      }
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = json.choices?.[0]?.message?.content;
      if (!content) return null;
      const parsed = JSON.parse(content) as {
        agent_id?: string;
        confidence?: number;
        reason?: string;
      };
      if (!parsed.agent_id || !ids.includes(parsed.agent_id)) return null;
      return {
        agentId: parsed.agent_id,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        reason: parsed.reason ?? '',
      };
    } catch (err) {
      console.warn('[agent-router] failed', err);
      return null;
    }
  }
}

export const agentRouter = new AgentRouter();
