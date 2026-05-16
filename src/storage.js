// Versioned localStorage layer. Bump VERSION if the shape changes
// in a non-backward-compatible way.
const VERSION = 1;
const KEY_STATE    = "life-rpg:v1:state";
const KEY_PROVIDER = "life-rpg:v1:provider";   // "gemini" | "claude"
const KEY_GEMINI   = "life-rpg:v1:key:gemini";
const KEY_CLAUDE   = "life-rpg:v1:key:claude";

const DEFAULT_STATE = {
  version: VERSION,
  phase: "questionnaire", // "questionnaire" | "app"
  xpMap: {},
  log: [],
};

// ── App state ────────────────────────────────────────────────────────────────

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY_STATE);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    if (parsed.version !== VERSION) return { ...DEFAULT_STATE };
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY_STATE, JSON.stringify({ ...state, version: VERSION }));
  } catch (e) {
    console.warn("Could not save state:", e);
  }
}

export function clearState() {
  try { localStorage.removeItem(KEY_STATE); } catch {}
}

// ── Provider selection ───────────────────────────────────────────────────────

export function loadProvider() {
  try { return localStorage.getItem(KEY_PROVIDER) || "gemini"; }
  catch { return "gemini"; }
}

export function saveProvider(provider) {
  try {
    if (provider) localStorage.setItem(KEY_PROVIDER, provider);
    else localStorage.removeItem(KEY_PROVIDER);
  } catch {}
}

// ── API keys (one per provider) ──────────────────────────────────────────────

export function loadKeys() {
  try {
    return {
      gemini: localStorage.getItem(KEY_GEMINI) || "",
      claude: localStorage.getItem(KEY_CLAUDE) || "",
    };
  } catch {
    return { gemini: "", claude: "" };
  }
}

export function saveKey(provider, key) {
  const storageKey = provider === "claude" ? KEY_CLAUDE : KEY_GEMINI;
  try {
    if (key) localStorage.setItem(storageKey, key);
    else localStorage.removeItem(storageKey);
  } catch {}
}

// ── Export / Import ──────────────────────────────────────────────────────────
// API keys are intentionally excluded from exports.

export function exportToJson(state) {
  const blob = new Blob(
    [JSON.stringify({ ...state, version: VERSION, exportedAt: new Date().toISOString() }, null, 2)],
    { type: "application/json" }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  a.href = url;
  a.download = `life-rpg-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (typeof parsed !== "object" || parsed === null) throw new Error("Not an object");
        if (!parsed.xpMap || typeof parsed.xpMap !== "object") throw new Error("Missing xpMap");
        if (!Array.isArray(parsed.log)) throw new Error("Missing log");
        resolve({ version: VERSION, phase: "app", xpMap: parsed.xpMap, log: parsed.log });
      } catch (e) { reject(e); }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}