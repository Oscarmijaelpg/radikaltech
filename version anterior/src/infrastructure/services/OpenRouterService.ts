
let __openrouter_key: string | undefined = import.meta.env.VITE_OPENROUTER_API_KEY as any;
if (!__openrouter_key && typeof window !== 'undefined') {
  try {
    const k1 = window.localStorage?.getItem('VITE_OPENROUTER_API_KEY') || undefined;
    const k2 = window.localStorage?.getItem('OPENROUTER_API_KEY') || undefined;
    __openrouter_key = k1 || k2;
  } catch {}
}
export const OPENROUTER_API_KEY = __openrouter_key;

export interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | any[]; // Support for multi-modal (text + images)
}

export const callOpenRouter = async (model: string, messages: OpenRouterMessage[]): Promise<string> => {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000); // 5m timeout

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin, // Required by OpenRouter for usage stats (optional but recommended)
        "X-Title": "RadikalChat", // Optional for OpenRouter app listing
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: 8192,
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenRouter API Error Details:', JSON.stringify(errorData, null, 2));
      throw new Error(`OpenRouter API request failed with status ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();

    // Validate response structure
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from OpenRouter');
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling OpenRouter:', error);
    throw error;
  }
};

export const callOpenRouterStreaming = async (
  model: string,
  messages: OpenRouterMessage[],
  onChunk: (chunk: string) => void,
  onUsage?: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => void
): Promise<string> => {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000); // 5m timeout

  try {
    const requestBody = JSON.stringify({
      model: model,
      messages: messages,
      stream: true,
      include_usage: true,
      max_tokens: 8192,
      temperature: 0.7,
    });


    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "RadikalChat",
      },
      body: requestBody
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenRouter API Error Details:', JSON.stringify(errorData, null, 2));
      throw new Error(`OpenRouter API request failed with status ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.substring(6));
            if (data.usage && onUsage) {
              onUsage(data.usage);
            }
            const content = data.choices?.[0]?.delta?.content || "";
            if (content) {
              fullText += content;
              onChunk(content);
            }
          } catch (e) {
            console.warn('Error parsing stream chunk', e);
          }
        }
      }
    }

    return fullText;

  } catch (error) {
    console.error('Error calling OpenRouter Streaming:', error);
    throw error;
  }
};
