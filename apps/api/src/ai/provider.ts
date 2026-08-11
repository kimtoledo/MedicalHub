/**
 * LLM provider abstraction.
 *
 * Supports any OpenAI-compatible API (OpenAI, xAI/Grok, local Ollama, etc.)
 * by reading OPENAI_API_KEY / OPENAI_BASE_URL from environment.
 *
 * To use xAI / Grok:
 *   OPENAI_API_KEY=xai-…
 *   OPENAI_BASE_URL=https://api.x.ai/v1
 *   OPENAI_MODEL=grok-3-mini
 */

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type CompletionResult = {
  text: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
};

export type LLMProvider = {
  /**
   * Non-streaming completion. Resolves when the full response is ready.
   */
  complete(messages: ChatMessage[]): Promise<CompletionResult>;

  /**
   * Streaming completion. Yields text deltas. Caller streams them to the client.
   * The final yielded token is '[DONE]'.
   */
  stream(messages: ChatMessage[]): AsyncGenerator<string>;

  /** Model identifier for audit logging. */
  readonly modelName: string;

  /** Whether a provider is configured (API key present). */
  readonly isConfigured: boolean;
};

// ---------------------------------------------------------------------------
// OpenAI-compatible implementation
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';

type OpenAIStreamChunk = {
  choices: {
    delta: { content?: string };
    finish_reason: string | null;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
};

type OpenAIResponse = {
  choices: {
    message: { content: string };
  }[];
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
};

export function createLLMProvider(): LLMProvider {
  const apiKey = process.env.OPENAI_API_KEY ?? '';
  const baseUrl = (process.env.OPENAI_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;

  function headers() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    };
  }

  return {
    modelName: model,
    isConfigured: apiKey.length > 0,

    async complete(messages) {
      if (!apiKey) {
        throw new Error('LLM_NOT_CONFIGURED');
      }
      const resp = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.3,
          max_tokens: 800,
        }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`LLM API error ${resp.status}: ${text.slice(0, 200)}`);
      }
      const data = (await resp.json()) as OpenAIResponse;
      return {
        text: data.choices[0]?.message.content ?? '',
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        model: data.model ?? model,
      };
    },

    async *stream(messages) {
      if (!apiKey) {
        throw new Error('LLM_NOT_CONFIGURED');
      }
      const resp = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.3,
          max_tokens: 800,
          stream: true,
        }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`LLM API error ${resp.status}: ${text.slice(0, 200)}`);
      }
      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const payload = trimmed.slice(6);
          if (payload === '[DONE]') return;
          try {
            const chunk = JSON.parse(payload) as OpenAIStreamChunk;
            const delta = chunk.choices[0]?.delta.content;
            if (delta) yield delta;
          } catch {
            // ignore parse errors
          }
        }
      }
    },
  };
}
