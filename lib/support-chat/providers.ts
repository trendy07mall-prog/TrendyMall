import "server-only";
import type { ChatMessage } from "@/lib/support-chat/guard";
import type { ToolDefinition } from "@/lib/support-chat/tools";

// Two interchangeable model backends, both reached with plain fetch() so
// no SDK is added for either:
//
// - primary: Google's Gemini API (GEMINI_API_KEY), free tier.
// - fallback: any OpenAI-compatible chat API (FALLBACK_AI_API_KEY), e.g.
//   Groq's or OpenRouter's free tiers, used only when the primary is
//   missing, rate limited or down.
//
// Each runs the same small loop: send the conversation, run any tools the
// model asks for, send the results back, until it answers in text.

export interface AgentInput {
  system: string;
  history: ChatMessage[];
  tools: ToolDefinition[];
  executeTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}

export interface AgentResult {
  reply: string;
  provider: "primary" | "fallback";
}

// Tool rounds per customer message. The last round forbids tools so the
// model has to answer with what it already has.
const MAX_ROUNDS = 4;
const REQUEST_TIMEOUT_MS = 25_000;

class ProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

// Keys pasted into a dashboard easily pick up a stray space, newline or
// pair of quotes, which the API then rejects as invalid.
function cleanKey(value: string | undefined): string | undefined {
  const key = value?.trim().replace(/^["']|["']$/g, "").trim();
  return key || undefined;
}

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ProviderError(`HTTP ${res.status}: ${text.slice(0, 300)}`, res.status);
  }
  return res.json();
}

function parseArgs(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object") return raw as Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

// ── Gemini ────────────────────────────────────────────────────────────

type GeminiPart = {
  text?: string;
  thought?: boolean;
  functionCall?: { name: string; args?: unknown };
  [key: string]: unknown;
};
type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

// Gemini's function declarations use OpenAPI-style upper-case type names.
function toGeminiSchema(parameters: ToolDefinition["parameters"]) {
  return {
    type: "OBJECT",
    properties: Object.fromEntries(
      Object.entries(parameters.properties).map(([key, prop]) => [
        key,
        { type: prop.type.toUpperCase(), description: prop.description },
      ]),
    ),
    required: parameters.required,
  };
}

// Aliases and model names are retired over time; if the configured one is
// gone (404), the next is tried rather than the chat going silent.
const GEMINI_DEFAULT_MODELS = ["gemini-flash-latest", "gemini-2.5-flash"];

async function runGemini(input: AgentInput, apiKey: string): Promise<string> {
  const configured = process.env.GEMINI_MODEL?.trim();
  const models = [...new Set([...(configured ? [configured] : []), ...GEMINI_DEFAULT_MODELS])];
  for (const [i, model] of models.entries()) {
    try {
      try {
        return await runGeminiModel(input, apiKey, model, false);
      } catch (error) {
        // A model that refuses the no-thinking setting (400) still gets
        // asked, just with its default thinking.
        if (!(error instanceof ProviderError && error.status === 400)) throw error;
        console.error(`[support-chat] Gemini model ${model} rejected thinkingBudget 0, retrying with defaults`);
        return await runGeminiModel(input, apiKey, model, true);
      }
    } catch (error) {
      if (!(error instanceof ProviderError && error.status === 404) || i === models.length - 1) throw error;
      console.error(`[support-chat] Gemini model ${model} not found, trying the next one`);
    }
  }
  throw new ProviderError("No Gemini model available");
}

async function runGeminiModel(
  input: AgentInput,
  apiKey: string,
  model: string,
  allowThinking: boolean,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const contents: GeminiContent[] = input.history.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const lastRound = round === MAX_ROUNDS - 1;
    const data = (await postJson(
      url,
      { "x-goog-api-key": apiKey },
      {
        systemInstruction: { parts: [{ text: input.system }] },
        contents,
        tools: [
          {
            functionDeclarations: input.tools.map((t) => ({
              name: t.name,
              description: t.description,
              parameters: toGeminiSchema(t.parameters),
            })),
          },
        ],
        toolConfig: { functionCallingConfig: { mode: lastRound ? "NONE" : "AUTO" } },
        // Thinking is switched off: with it on, Flash models were taking
        // over 20s to say hello, and support answers come from tool
        // results, not reasoning. maxOutputTokens stays generous for the
        // retry with thinking on, which spends part of it thinking.
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
          ...(allowThinking ? {} : { thinkingConfig: { thinkingBudget: 0 } }),
        },
      },
    )) as {
      candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
      promptFeedback?: { blockReason?: string };
    };

    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];
    const calls = parts.filter((p) => p.functionCall);

    if (calls.length === 0) {
      const text = parts
        .filter((p) => typeof p.text === "string" && !p.thought)
        .map((p) => p.text)
        .join("")
        .trim();
      if (!text) {
        const reason = candidate?.finishReason ?? data.promptFeedback?.blockReason ?? "unknown";
        throw new ProviderError(`Empty reply (${reason})`);
      }
      return text;
    }

    // The model's turn goes back verbatim -- newer Gemini models attach a
    // thought signature to function-call parts that must be returned as is.
    contents.push({ role: "model", parts });
    const responses = await Promise.all(
      calls.map(async (p) => {
        const name = p.functionCall!.name;
        const result = await input.executeTool(name, parseArgs(p.functionCall!.args));
        return { functionResponse: { name, response: { result } } };
      }),
    );
    contents.push({ role: "user", parts: responses });
  }

  throw new ProviderError("Too many tool rounds");
}

// ── OpenAI-compatible fallback ────────────────────────────────────────

type OpenAiMessage =
  | { role: "system" | "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
    }
  | { role: "tool"; tool_call_id: string; content: string };

async function runOpenAiCompatible(input: AgentInput, apiKey: string): Promise<string> {
  const baseUrl = (process.env.FALLBACK_AI_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/$/, "");
  const model = process.env.FALLBACK_AI_MODEL || "llama-3.3-70b-versatile";

  const messages: OpenAiMessage[] = [
    { role: "system", content: input.system },
    ...input.history.map((m) => ({ role: m.role, content: m.content }) as OpenAiMessage),
  ];
  const tools = input.tools.map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const lastRound = round === MAX_ROUNDS - 1;
    const data = (await postJson(
      `${baseUrl}/chat/completions`,
      { Authorization: `Bearer ${apiKey}` },
      {
        model,
        messages,
        tools,
        tool_choice: lastRound ? "none" : "auto",
        temperature: 0.3,
        max_tokens: 1024,
      },
    )) as { choices?: { message?: Extract<OpenAiMessage, { role: "assistant" }> }[] };

    const message = data.choices?.[0]?.message;
    if (!message) throw new ProviderError("No choices");
    const calls = message.tool_calls ?? [];

    if (calls.length === 0) {
      const text = (message.content ?? "").trim();
      if (!text) throw new ProviderError("Empty reply");
      return text;
    }

    messages.push({ role: "assistant", content: message.content ?? null, tool_calls: calls });
    for (const call of calls) {
      const result = await input.executeTool(call.function.name, parseArgs(call.function.arguments));
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }

  throw new ProviderError("Too many tool rounds");
}

export function isSupportChatConfigured(): boolean {
  return Boolean(cleanKey(process.env.GEMINI_API_KEY) || cleanKey(process.env.FALLBACK_AI_API_KEY));
}

export async function runSupportAgent(input: AgentInput): Promise<AgentResult> {
  const primaryKey = cleanKey(process.env.GEMINI_API_KEY);
  const fallbackKey = cleanKey(process.env.FALLBACK_AI_API_KEY);

  if (primaryKey) {
    try {
      return { reply: await runGemini(input, primaryKey), provider: "primary" };
    } catch (error) {
      console.error("[support-chat] primary model failed", error);
      if (!fallbackKey) throw error;
    }
  }
  if (fallbackKey) {
    return { reply: await runOpenAiCompatible(input, fallbackKey), provider: "fallback" };
  }
  throw new ProviderError("No AI provider configured");
}
