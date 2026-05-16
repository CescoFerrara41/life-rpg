import { STAT_IDS } from "./stats.js";

const VALID_STATS = new Set(STAT_IDS);

// ── SHARED PROMPT ─────────────────────────────────────────────────────────────

function buildPrompt(taskText) {
  const statList = STAT_IDS.join(", ");
  return `You are an XP allocation system for a real-life RPG. A user completed this task: "${taskText}"

Available stats: ${statList}

Return ONLY valid JSON (no markdown, no explanation) like:
{"xp": {"strength": 40, "health": 20}, "summary": "One sentence about what they earned."}

Rules:
- Only include stats from the list above that GENUINELY apply to this task.
- If the task does not genuinely relate to ANY of the listed stats, return {"xp": {}, "summary": "..."} with an EMPTY xp object and a brief summary explaining it does not match any tracked stat. Do NOT invent partial matches just to award something.
- XP range 5-500 per stat. Scale by effort/mastery:
  - Quick/easy task: 5-30 XP
  - Moderate effort (few hours): 30-100 XP
  - Major effort (days/weeks): 100-250 XP
  - Mastery/completion of long goal: 250-500 XP
- Tasks can affect multiple stats.
- Be generous but realistic. Do not award XP for stats that don't truly apply.`;
}

// ── RESPONSE SANITIZER ────────────────────────────────────────────────────────

function sanitize(rawText) {
  const clean = rawText.replace(/```json|```/g, "").trim();
  let parsed;
  try { parsed = JSON.parse(clean); }
  catch { return { xp: {}, summary: "AI response was not valid JSON.", error: "parse" }; }

  const cleanXp = {};
  if (parsed?.xp && typeof parsed.xp === "object") {
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
}

// ── GEMINI ────────────────────────────────────────────────────────────────────

const GEMINI_MODEL = "gemini-2.5-flash";
const geminiUrl = (key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`;

async function analyzeWithGemini(taskText, apiKey) {
  if (!apiKey) return { xp: {}, summary: "No Gemini API key set. Add it in Settings.", error: "no_key" };

  try {
    const res = await fetch(geminiUrl(apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(taskText) }] }],
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: 400, temperature: 0.2 },
      }),
    });

    if (!res.ok) {
      let detail = "";
      try { const e = await res.json(); detail = e?.error?.message || ""; } catch {}
      if (res.status === 400 && detail.toLowerCase().includes("api key"))
        return { xp: {}, summary: "Gemini API key was rejected. Check Settings.", error: "auth" };
      if (res.status === 401 || res.status === 403)
        return { xp: {}, summary: "Gemini API key was rejected. Check Settings.", error: "auth" };
      if (res.status === 429)
        return { xp: {}, summary: "Gemini rate limit hit — try again in a minute.", error: "rate_limit" };
      return { xp: {}, summary: `Gemini request failed (${res.status})${detail ? ": " + detail : ""}.`, error: "http" };
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    return sanitize(text);
  } catch {
    return { xp: {}, summary: "Network error reaching Gemini. Check your connection.", error: "network" };
  }
}

// ── CLAUDE ────────────────────────────────────────────────────────────────────

const CLAUDE_MODEL = "claude-haiku-4-5-20251001";

async function analyzeWithClaude(taskText, apiKey) {
  if (!apiKey) return { xp: {}, summary: "No Claude API key set. Add it in Settings.", error: "no_key" };

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
        model: CLAUDE_MODEL,
        max_tokens: 400,
        messages: [{ role: "user", content: buildPrompt(taskText) }],
      }),
    });

    if (!res.ok) {
      let detail = "";
      try { const e = await res.json(); detail = e?.error?.message || ""; } catch {}
      if (res.status === 401 || res.status === 403)
        return { xp: {}, summary: "Claude API key was rejected. Check Settings.", error: "auth" };
      if (res.status === 429)
        return { xp: {}, summary: "Claude rate limit hit — try again in a moment.", error: "rate_limit" };
      return { xp: {}, summary: `Claude request failed (${res.status})${detail ? ": " + detail : ""}.`, error: "http" };
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || "{}";
    return sanitize(text);
  } catch {
    return { xp: {}, summary: "Network error reaching Claude. Check your connection.", error: "network" };
  }
}

// ── UNIFIED ENTRY POINT ───────────────────────────────────────────────────────

export async function analyzeTask(taskText, provider, keys) {
  if (provider === "claude") return analyzeWithClaude(taskText, keys.claude);
  return analyzeWithGemini(taskText, keys.gemini);
}

export const PROVIDERS = {
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    model: "Gemini 2.5 Flash",
    icon: "🌐",
    badge: "Free",
    badgeColor: "#55EFC4",
    placeholder: "AIza...",
    keyHint: "No credit card needed",
    link: "https://aistudio.google.com/app/apikey",
    linkLabel: "aistudio.google.com",
    storedMsg: "Key stored — using Gemini 2.5 Flash (free tier).",
  },
  claude: {
    id: "claude",
    name: "Anthropic Claude",
    model: "Claude Haiku 4.5",
    icon: "🤖",
    badge: "Paid",
    badgeColor: "#FDCB6E",
    placeholder: "sk-ant-...",
    keyHint: "Requires Anthropic API account (~$0.001/task)",
    link: "https://console.anthropic.com/",
    linkLabel: "console.anthropic.com",
    storedMsg: "Key stored — using Claude Haiku 4.5.",
  },
};