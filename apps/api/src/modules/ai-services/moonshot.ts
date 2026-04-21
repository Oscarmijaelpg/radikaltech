import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

export interface MoonshotMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

export async function moonshotWebSearch(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!env.MOONSHOT_API_KEY) {
    throw new Error('MOONSHOT_API_KEY no configurada');
  }

  const messages: MoonshotMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  const tools = [
    {
      type: "builtin_function",
      function: {
        name: "$web_search"
      }
    }
  ];

  let finishReason: string | null = null;
  let finalContent = "";

  while (finishReason === null || finishReason === "tool_calls") {
    const res = await fetch("https://api.moonshot.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.MOONSHOT_API_KEY}`
      },
      body: JSON.stringify({
        model: "kimi-k2.6",
        messages,
        temperature: 0.6,
        tools,
        // En Moonshot, usar $web_search internamente
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      logger.error({ status: res.status, errorText }, 'Moonshot API failed');
      throw new Error(`Moonshot API error: ${res.status}`);
    }

    const body = await res.json();
    const choice = body.choices[0];
    finishReason = choice.finish_reason;
    const message = choice.message;

    if (finishReason === "tool_calls" && message.tool_calls) {
      messages.push(message);
      
      for (const toolCall of message.tool_calls) {
        if (toolCall.function.name === "$web_search") {
          // Kimi ejecutó la búsqueda. Los resultados de la búsqueda vienen inyectados en los argumentos de la tool
          let toolResult = {};
          try {
            toolResult = JSON.parse(toolCall.function.arguments);
          } catch (e) {
            logger.warn({ err: e }, 'Error parsing Moonshot web search arguments');
          }
          
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: JSON.stringify(toolResult)
          });
        } else {
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: JSON.stringify({ error: "no tool found" })
          });
        }
      }
    } else {
      finalContent = message.content || "";
    }
  }

  return finalContent;
}
