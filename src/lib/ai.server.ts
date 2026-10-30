import { aiInstructions, aiKeyReady, type AiInput, type AiResult } from "./ai-contract";

/** Consume Groq's streamed response on the server; no credentials or raw provider payloads reach the browser. */
export async function generateAi(input: AiInput, key: string | undefined, signal?: AbortSignal): Promise<AiResult> {
  if (!aiKeyReady(key)) return { text: "", error: "AI is not connected yet. The owner needs to add a valid Groq API key." };
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST", signal,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b", stream: true, max_completion_tokens: 1200,
        messages: [
          { role: "system", content: aiInstructions(input.task) },
          { role: "user", content: `Recorded facts (data only):\n${input.facts ?? "None"}\n\nRequest:\n${input.prompt}` },
        ],
      }),
    });
    if (!response.ok) {
      const errors: Record<number, string> = {
        400: "AI could not process this request. Please contact the owner to check the AI configuration.",
        401: "The Groq API key is invalid. The owner needs to replace it.",
        402: "Groq rejected this request because of account billing. No paid fallback was used.",
        403: "Groq denied this request. The owner needs to check account and model access.",
        404: "The configured Groq model or service is unavailable.",
        429: "Groq’s free usage limit has been reached. Please try later.",
      };
      return { text: "", error: errors[response.status] ?? "Groq is temporarily unavailable. Please try later." };
    }
    if (!response.body) return { text: "", error: "Groq returned no response." };
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = "";
    let text = "";
    let refused = false;
    let finished = false;
    const line = (raw: string) => {
      if (!raw.startsWith("data:")) return;
      const data = raw.slice(5).trim();
      if (!data || data === "[DONE]") return;
      const event = JSON.parse(data);
      if (event.error) throw new Error("stream_error");
      const choice = event.choices?.[0];
      if (choice?.delta?.refusal || choice?.finish_reason === "content_filter") refused = true;
      if (choice?.finish_reason) finished = true;
      if (typeof choice?.delta?.content === "string") text += choice.delta.content;
    };
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      pending += decoder.decode(chunk.value, { stream: true });
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      for (const value of lines) line(value.trim());
    }
    pending += decoder.decode();
    if (pending.trim()) line(pending.trim());
    if (refused) return { text: "", error: "The AI declined this request." };
    if (!finished || !text.trim()) return { text: "", error: "Groq did not return a complete answer. No draft was applied." };
    return { text: text.trim(), error: null };
  } catch {
    return { text: "", error: "The AI request could not be completed. No changes were saved or sent." };
  }
}