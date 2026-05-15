// Versioned localStorage layer. Bump VERSION if the shape changes
// in a non-backward-compatible way.
const VERSION = 1;
const KEY = "life-rpg:v1:state";
const KEY_API = "life-rpg:v1:apikey";

const DEFAULT_STATE = {
  version: VERSION,
  phase: "questionnaire", // "questionnaire" | "app"
  xpMap: {},
  log: [],
};

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
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
    const toSave = { ...state, version: VERSION };
    localStorage.setItem(KEY, JSON.stringify(toSave));
  } catch (e) {
    // Quota / private-mode fallback — silent. UI shows a notice elsewhere.
    console.warn("Could not save state:", e);
  }
}

export function clearState() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

// API key is kept under its own key so wiping app data doesn't nuke the key,
// and exporting data doesn't include the key.
export function loadApiKey() {
  try {
    return localStorage.getItem(KEY_API) || "";
  } catch {
    return "";
  }
}

export function saveApiKey(key) {
  try {
    if (key) localStorage.setItem(KEY_API, key);
    else localStorage.removeItem(KEY_API);
  } catch {}
}

// ── Export / Import ──────────────────────────────────────────────────────────
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
        // Basic validation
        if (typeof parsed !== "object" || parsed === null) throw new Error("Not an object");
        if (!parsed.xpMap || typeof parsed.xpMap !== "object") throw new Error("Missing xpMap");
        if (!Array.isArray(parsed.log)) throw new Error("Missing log");
        resolve({
          version: VERSION,
          phase: "app",
          xpMap: parsed.xpMap,
          log: parsed.log,
        });
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
