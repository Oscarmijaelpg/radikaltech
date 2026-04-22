import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

export interface MoonshotMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string;
  tool_calls?: unknown[];
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
  let turns = 0;
  const MAX_TURNS = 10;

  while ((finishReason === null || finishReason === "tool_calls") && turns < MAX_TURNS) {
    turns++;
    const res = await fetch("https://api.moonshot.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.MOONSHOT_API_KEY?.trim()}`
      },
      body: JSON.stringify({
        model: "moonshot-v1-8k",
        messages,
        temperature: 0.6,
        tools,
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      logger.error({ status: res.status, errorText }, 'Moonshot API failed');
      throw new Error(`Moonshot API error (${res.status}): ${errorText}`);
    }

    const body = await res.json();
    const choice = body.choices[0];
    finishReason = choice.finish_reason;
    const message = choice.message;

    if (finishReason === "tool_calls" && message.tool_calls) {
      messages.push(message);
      
      for (const toolCall of message.tool_calls) {
        // En Moonshot, para builtin_function como $web_search, 
        // simplemente devolvemos los argumentos como "content" para que el backend de Moonshot
        // inyecte los resultados reales en el siguiente turno.
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: toolCall.function.arguments // Enviamos los argumentos tal cual
        });
      }
    } else {
      finalContent = message.content || "";
    }
  }

  return finalContent;
}
