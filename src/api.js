import { STAT_IDS } from "./stats.js";

// Set of valid stat IDs, used to filter out anything the AI invents.
const VALID_STATS = new Set(STAT_IDS);

/**
 * Calls Anthropic directly from the browser using the user's own API key.
 * Returns { xp: { statId: number, ... }, summary: string }.
 *
 * Key rule (per user requirement): if no stat applies, return EMPTY xp.
 * The caller treats empty xp as "no XP awarded."
 */
export async function analyzeTask(taskText, apiKey, model = "claude-haiku-4-5-20251001") {
  if (!apiKey) {
    return { xp: {}, summary: "No API key set. Add yours in Settings.", error: "no_key" };
  }

  const statList = STAT_IDS.join(", ");
  const prompt = `You are an XP allocation system for a real-life RPG. A user completed this task: "${taskText}"

Available stats: ${statList}

Return ONLY valid JSON (no markdown, no explanation) like:
{"xp": {"strength": 40, "health": 20}, "summary": "One sentence about what they earned."}

Rules:
- Only include stats from the list above that GENUINELY apply to this task.
- If the task does not genuinely relate to ANY of the listed stats, return {"xp": {}, "summary": "..."} with an EMPTY xp object and a brief summary explaining it does not match any tracked stat. Do NOT invent partial matches just to award something.
- XP range 5–500 per stat. Scale by effort/mastery:
  - Quick/easy task: 5-30 XP
  - Moderate effort (few hours): 30-100 XP
  - Major effort (days/weeks): 100-250 XP
  - Mastery/completion of long goal: 250-500 XP
- Tasks can affect multiple stats.
- Be generous but realistic. Do not award XP for stats that don't truly apply.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model,
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      let detail = "";
      try {
        const errData = await res.json();
        detail = errData?.error?.message || "";
      } catch {}
      if (res.status === 401 || res.status === 403) {
        return { xp: {}, summary: "API key was rejected. Check Settings.", error: "auth" };
      }
      if (res.status === 429) {
        return { xp: {}, summary: "Rate limited — try again in a moment.", error: "rate_limit" };
      }
      return { xp: {}, summary: `Request failed (${res.status})${detail ? ": " + detail : ""}.`, error: "http" };
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return { xp: {}, summary: "AI response was not valid JSON.", error: "parse" };
    }

    // Sanitize: keep only known stats with positive integer XP, capped at 500.
    const cleanXp = {};
    if (parsed && parsed.xp && typeof parsed.xp === "object") {
      for (const [k, v] of Object.entries(parsed.xp)) {
        if (!VALID_STATS.has(k)) continue;
        const n = Math.round(Number(v));
        if (!Number.isFinite(n) || n <= 0) continue;
        cleanXp[k] = Math.min(500, n);
      }
    }

    return {
      xp: cleanXp,
      summary: typeof parsed?.summary === "string" ? parsed.summary : "",
    };
  } catch (e) {
    return { xp: {}, summary: "Network error. Check your connection.", error: "network" };
  }
}
