import { useState, useEffect, useRef, useCallback } from "react";
import {
  STATS,
  QUESTIONS,
  xpForLevel,
  getLevelFromXp,
  initStats,
} from "./stats.js";
import { analyzeTask } from "./api.js";
import {
  loadState,
  saveState,
  clearState,
  loadApiKey,
  saveApiKey,
  exportToJson,
  importFromFile,
} from "./storage.js";

// ── PRIMITIVES ───────────────────────────────────────────────────────────────

function XPBar({ current, needed, color, animated }) {
  const pct = Math.min(100, (current / needed) * 100);
  return (
    <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 99, height: 6, overflow: "hidden" }}>
      <div style={{
        height: "100%", borderRadius: 99,
        background: `linear-gradient(90deg, ${color}99, ${color})`,
        width: `${pct}%`,
        transition: animated ? "width 0.8s cubic-bezier(0.23,1,0.32,1)" : "none",
        boxShadow: `0 0 8px ${color}88`,
      }} />
    </div>
  );
}

function StatCard({ stat, xp, highlight }) {
  const info = STATS.find(s => s.id === stat);
  const { level, currentXp, neededXp } = getLevelFromXp(xp);
  return (
    <div style={{
      background: highlight
        ? `linear-gradient(135deg, ${info.color}22, ${info.color}08)`
        : "rgba(255,255,255,0.04)",
      border: `1px solid ${highlight ? info.color + "55" : "rgba(255,255,255,0.07)"}`,
      borderRadius: 16, padding: "14px 16px",
      transition: "all 0.4s ease",
      boxShadow: highlight ? `0 0 20px ${info.color}33` : "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 22 }}>{info.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", fontFamily: "'DM Sans', sans-serif" }}>{info.label}</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: info.color, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: -0.5 }}>
              {level}
            </span>
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>{info.desc}</div>
        </div>
      </div>
      <XPBar current={currentXp} needed={neededXp} color={info.color} animated={highlight} />
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 4, textAlign: "right" }}>
        {currentXp} / {neededXp} XP
      </div>
    </div>
  );
}

// ── QUESTIONNAIRE ────────────────────────────────────────────────────────────

function QuestionnaireScreen({ onComplete }) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({});
  const q = QUESTIONS[step];
  const val = values[q.stat] ?? 50;
  const info = STATS.find(s => s.id === q.stat);

  function next() {
    if (step < QUESTIONS.length - 1) setStep(s => s + 1);
    else onComplete(values);
  }

  function back() {
    if (step > 0) setStep(s => s - 1);
  }

  function skip() {
    onComplete({});
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#0A0A0F",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "0 24px", fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Stars bg */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {Array.from({ length: 60 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            width: Math.random() * 2 + 1, height: Math.random() * 2 + 1,
            borderRadius: "50%", background: "rgba(255,255,255,0.4)",
            top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
            animation: `twinkle ${2 + Math.random() * 3}s infinite alternate`,
            animationDelay: `${Math.random() * 3}s`,
          }} />
        ))}
      </div>

      <div style={{ width: "100%", maxWidth: 420, position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>⚔️</div>
          <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 900, margin: "0 0 4px", fontFamily: "'Space Grotesk', sans-serif" }}>
            Life RPG
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: 0 }}>
            Character creation — {step + 1} of {QUESTIONS.length}
          </p>
        </div>

        {/* Progress */}
        <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 99, height: 4, marginBottom: 32, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 99,
            background: `linear-gradient(90deg, ${info.color}, ${info.color}cc)`,
            width: `${((step + 1) / QUESTIONS.length) * 100}%`,
            transition: "width 0.5s ease",
            boxShadow: `0 0 10px ${info.color}`,
          }} />
        </div>

        <div style={{
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 24, padding: 28,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: `${info.color}22`, border: `1px solid ${info.color}44`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
            }}>{info.icon}</div>
            <div>
              <div style={{ color: info.color, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{info.label}</div>
              <div style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>{q.q}</div>
            </div>
          </div>

          {/* Slider */}
          <div style={{ margin: "24px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{q.min}</span>
              <span style={{
                fontSize: 20, fontWeight: 800, color: info.color, fontFamily: "'Space Grotesk', sans-serif",
              }}>{val}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{q.max}</span>
            </div>
            <input
              type="range" min={0} max={100} value={val}
              onChange={e => setValues(v => ({ ...v, [q.stat]: +e.target.value }))}
              style={{ width: "100%", accentColor: info.color, cursor: "pointer", color: info.color }}
            />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {step > 0 && (
              <button onClick={back} style={{
                flex: "0 0 auto", padding: "14px 18px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 14, color: "rgba(255,255,255,0.7)",
                fontSize: 15, fontWeight: 600, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}>
                ←
              </button>
            )}
            <button onClick={next} style={{
              flex: 1, padding: "14px 0",
              background: `linear-gradient(135deg, ${info.color}, ${info.color}bb)`,
              border: "none", borderRadius: 14, color: "#000",
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              boxShadow: `0 4px 20px ${info.color}44`,
              transition: "transform 0.15s", fontFamily: "'DM Sans', sans-serif",
            }}>
              {step < QUESTIONS.length - 1 ? "Next →" : "Begin Adventure ⚔️"}
            </button>
          </div>
        </div>

        <button onClick={skip} style={{
          marginTop: 16, background: "none", border: "none",
          color: "rgba(255,255,255,0.25)", fontSize: 13, cursor: "pointer", width: "100%",
        }}>
          Skip questionnaire (start at 0)
        </button>
      </div>
    </div>
  );
}

// ── STATS TAB ────────────────────────────────────────────────────────────────

function StatsTab({ xpMap, recentGains }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("level"); // level | name | recent

  const filtered = STATS
    .filter(s => s.label.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "level") return getLevelFromXp(xpMap[b.id] || 0).level - getLevelFromXp(xpMap[a.id] || 0).level;
      if (sort === "name") return a.label.localeCompare(b.label);
      if (sort === "recent") return (recentGains[b.id] || 0) - (recentGains[a.id] || 0);
      return 0;
    });

  const totalLevel = STATS.reduce((sum, s) => sum + getLevelFromXp(xpMap[s.id] || 0).level, 0);

  return (
    <div style={{ padding: "16px 16px 100px" }}>
      <div style={{
        background: "linear-gradient(135deg, #1a1a2e, #16213e)",
        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20,
        padding: 20, marginBottom: 16, textAlign: "center",
      }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Total Power Level</div>
        <div style={{ fontSize: 52, fontWeight: 900, color: "#fff", fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1 }}>{totalLevel}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>across {STATS.length} stats</div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          placeholder="🔍  Search stats…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12,
            color: "#fff", padding: "10px 14px", fontSize: 13,
            outline: "none", fontFamily: "'DM Sans', sans-serif",
          }}
        />
        <select value={sort} onChange={e => setSort(e.target.value)} style={{
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12, color: "#fff", padding: "10px 12px", fontSize: 13,
          outline: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
        }}>
          <option value="level">By Level</option>
          <option value="name">By Name</option>
          <option value="recent">Recent</option>
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {filtered.map(stat => (
          <StatCard
            key={stat.id} stat={stat.id}
            xp={xpMap[stat.id] || 0}
            highlight={!!(recentGains[stat.id])}
          />
        ))}
      </div>
    </div>
  );
}

// ── TASK TAB ─────────────────────────────────────────────────────────────────

function TaskTab({ onSubmit, log, onDeleteLogEntry, onUndoLast, apiKey, onOpenSettings }) {
  const [task, setTask] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!task.trim() || loading) return;
    if (!apiKey) {
      setError("Set your Anthropic API key in Settings first.");
      return;
    }
    setLoading(true);
    setResult(null);
    setError("");
    const r = await analyzeTask(task, apiKey);
    setResult(r);
    if (r.error) {
      setError(r.summary || "Something went wrong.");
    } else if (!r.xp || Object.keys(r.xp).length === 0) {
      // Task didn't match any tracked stat — explicit no-XP path.
      setError(r.summary || "This task doesn't match any tracked stat. No XP awarded.");
    } else {
      onSubmit(r, task);
    }
    setLoading(false);
    if (!r.error && r.xp && Object.keys(r.xp).length > 0) setTask("");
  }

  const lastEntry = log[log.length - 1];

  return (
    <div style={{ padding: "16px 16px 100px" }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "0 0 4px", fontFamily: "'Space Grotesk', sans-serif" }}>
          Log Achievement
        </h2>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: 0 }}>
          Describe what you accomplished — the AI will award XP.
        </p>
      </div>

      {!apiKey && (
        <div style={{
          background: "rgba(253,203,110,0.1)", border: "1px solid rgba(253,203,110,0.3)",
          borderRadius: 14, padding: "12px 14px", marginBottom: 12,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        }}>
          <div style={{ fontSize: 12, color: "#FDCB6E", lineHeight: 1.4 }}>
            Add your Anthropic API key in Settings to enable XP analysis.
          </div>
          <button onClick={onOpenSettings} style={{
            background: "#FDCB6E", border: "none", borderRadius: 10,
            padding: "8px 14px", color: "#000", fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap",
          }}>
            Open Settings
          </button>
        </div>
      )}

      <div style={{
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 20, padding: 16, marginBottom: 12,
      }}>
        <textarea
          value={task}
          onChange={e => setTask(e.target.value)}
          placeholder="e.g. 'Studied Japanese for 3 hours', 'Ran a 10K', 'Finished reading a history book', 'Cooked a new recipe from scratch'…"
          rows={4}
          style={{
            width: "100%", background: "none", border: "none", outline: "none",
            color: "#fff", fontSize: 14, resize: "none", lineHeight: 1.6,
            fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box",
          }}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!task.trim() || loading}
        style={{
          width: "100%", padding: "15px 0",
          background: task.trim() && !loading
            ? "linear-gradient(135deg, #a855f7, #6366f1)"
            : "rgba(255,255,255,0.08)",
          border: "none", borderRadius: 16,
          color: task.trim() && !loading ? "#fff" : "rgba(255,255,255,0.3)",
          fontSize: 15, fontWeight: 700, cursor: task.trim() && !loading ? "pointer" : "default",
          transition: "all 0.3s",
          boxShadow: task.trim() && !loading ? "0 4px 24px rgba(168,85,247,0.4)" : "none",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {loading ? "⚙️  Analyzing…" : "⚔️  Claim XP"}
      </button>

      {/* Error / no-match message */}
      {error && (
        <div style={{
          marginTop: 14,
          background: "rgba(255,107,107,0.08)",
          border: "1px solid rgba(255,107,107,0.25)",
          borderRadius: 14, padding: "12px 14px",
          color: "#FF9999", fontSize: 13, lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}

      {/* Successful result */}
      {result && !result.error && result.xp && Object.keys(result.xp).length > 0 && (
        <div style={{
          marginTop: 20,
          background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(99,102,241,0.1))",
          border: "1px solid rgba(168,85,247,0.3)",
          borderRadius: 20, padding: 20,
          animation: "slideUp 0.4s ease",
        }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 14, lineHeight: 1.5 }}>
            {result.summary}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(result.xp).map(([statId, xp]) => {
              const info = STATS.find(s => s.id === statId);
              if (!info) return null;
              return (
                <div key={statId} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: `${info.color}11`, border: `1px solid ${info.color}33`,
                  borderRadius: 12, padding: "10px 14px",
                }}>
                  <span style={{ fontSize: 18 }}>{info.icon}</span>
                  <span style={{ flex: 1, color: "#fff", fontSize: 13, fontWeight: 600 }}>{info.label}</span>
                  <span style={{
                    color: info.color, fontWeight: 800, fontSize: 16,
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}>+{xp} XP</span>
                </div>
              );
            })}
          </div>
          {lastEntry && lastEntry.task === task && (
            <button
              onClick={() => { onUndoLast(); setResult(null); }}
              style={{
                marginTop: 14, width: "100%",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12, padding: "10px 0", color: "rgba(255,255,255,0.7)",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}>
              Undo last claim
            </button>
          )}
        </div>
      )}

      {/* Log */}
      {log.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, textTransform: "uppercase", letterSpacing: 1, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
              Recent Achievements
            </h3>
            {log.length > 0 && (
              <button onClick={onUndoLast} style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10, padding: "5px 10px", color: "rgba(255,255,255,0.6)",
                fontSize: 11, fontWeight: 600, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}>
                ↶ Undo last
              </button>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...log].reverse().slice(0, 20).map((entry, i, arr) => {
              const realIdx = log.length - 1 - i; // index in original log
              return (
                <div key={entry.ts || realIdx} style={{
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 14, padding: "12px 14px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                    <div style={{ color: "#fff", fontSize: 13, fontWeight: 500, flex: 1 }}>{entry.task}</div>
                    <button
                      onClick={() => {
                        if (confirm("Delete this entry? This will subtract its XP from your stats.")) {
                          onDeleteLogEntry(realIdx);
                        }
                      }}
                      style={{
                        background: "none", border: "none", color: "rgba(255,255,255,0.3)",
                        cursor: "pointer", fontSize: 16, padding: 0, lineHeight: 1,
                      }}
                      aria-label="Delete entry"
                    >×</button>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {Object.entries(entry.xp).map(([sid, xp]) => {
                      const info = STATS.find(s => s.id === sid);
                      if (!info) return null;
                      return (
                        <span key={sid} style={{
                          background: `${info.color}22`, color: info.color,
                          borderRadius: 8, padding: "3px 8px", fontSize: 11, fontWeight: 700,
                        }}>
                          {info.icon} +{xp}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── SETTINGS TAB ─────────────────────────────────────────────────────────────

function SettingsTab({ apiKey, onSaveApiKey, onExport, onImport, onResetAll }) {
  const [keyInput, setKeyInput] = useState(apiKey || "");
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [importErr, setImportErr] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    setKeyInput(apiKey || "");
  }, [apiKey]);

  function saveKey() {
    onSaveApiKey(keyInput.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function clearKey() {
    setKeyInput("");
    onSaveApiKey("");
  }

  async function handleFile(e) {
    const f = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting same file
    if (!f) return;
    setImportErr("");
    try {
      await onImport(f);
    } catch (err) {
      setImportErr(err.message || "Could not import file.");
    }
  }

  return (
    <div style={{ padding: "16px 16px 100px" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "0 0 4px", fontFamily: "'Space Grotesk', sans-serif" }}>
          Settings
        </h2>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: 0 }}>
          API key, data backup, and reset.
        </p>
      </div>

      {/* API KEY */}
      <div style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 18, padding: 18, marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 20 }}>🔑</span>
          <h3 style={{ color: "#fff", fontSize: 15, fontWeight: 700, margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
            Anthropic API Key
          </h3>
        </div>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, lineHeight: 1.5, margin: "0 0 14px" }}>
          Stored only on this device. Get one at{" "}
          <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer"
             style={{ color: "#a855f7", textDecoration: "none" }}>
            console.anthropic.com
          </a>.
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            type={showKey ? "text" : "password"}
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            placeholder="sk-ant-..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            style={{
              flex: 1, background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12,
              color: "#fff", padding: "10px 12px", fontSize: 13,
              outline: "none", fontFamily: "monospace",
            }}
          />
          <button onClick={() => setShowKey(s => !s)} style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12, padding: "0 12px", color: "rgba(255,255,255,0.7)",
            fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          }}>
            {showKey ? "Hide" : "Show"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={saveKey} disabled={!keyInput.trim()} style={{
            flex: 1, padding: "11px 0",
            background: keyInput.trim()
              ? "linear-gradient(135deg, #a855f7, #6366f1)"
              : "rgba(255,255,255,0.06)",
            border: "none", borderRadius: 12,
            color: keyInput.trim() ? "#fff" : "rgba(255,255,255,0.3)",
            fontSize: 13, fontWeight: 700, cursor: keyInput.trim() ? "pointer" : "default",
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {saved ? "✓ Saved" : "Save key"}
          </button>
          {apiKey && (
            <button onClick={clearKey} style={{
              padding: "11px 16px",
              background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.3)",
              borderRadius: 12, color: "#FF9999", fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}>
              Clear
            </button>
          )}
        </div>
        {apiKey && (
          <div style={{ marginTop: 10, fontSize: 11, color: "rgba(85,239,196,0.8)" }}>
            ✓ Key stored. Tasks will be analyzed using your API account.
          </div>
        )}
      </div>

      {/* BACKUP */}
      <div style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 18, padding: 18, marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 20 }}>💾</span>
          <h3 style={{ color: "#fff", fontSize: 15, fontWeight: 700, margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
            Backup
          </h3>
        </div>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, lineHeight: 1.5, margin: "0 0 14px" }}>
          Save your stats & log as a JSON file, or restore from one. The API key is never included in exports.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onExport} style={{
            flex: 1, padding: "11px 0",
            background: "rgba(85,239,196,0.1)", border: "1px solid rgba(85,239,196,0.3)",
            borderRadius: 12, color: "#55EFC4", fontSize: 13, fontWeight: 700,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          }}>
            ↓ Export
          </button>
          <button onClick={() => fileRef.current?.click()} style={{
            flex: 1, padding: "11px 0",
            background: "rgba(116,185,255,0.1)", border: "1px solid rgba(116,185,255,0.3)",
            borderRadius: 12, color: "#74B9FF", fontSize: 13, fontWeight: 700,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          }}>
            ↑ Import
          </button>
          <input
            ref={fileRef} type="file" accept="application/json,.json"
            onChange={handleFile} style={{ display: "none" }}
          />
        </div>
        {importErr && (
          <div style={{ marginTop: 10, fontSize: 11, color: "#FF9999" }}>
            Import failed: {importErr}
          </div>
        )}
      </div>

      {/* RESET */}
      <div style={{
        background: "rgba(255,107,107,0.04)",
        border: "1px solid rgba(255,107,107,0.2)",
        borderRadius: 18, padding: 18,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <h3 style={{ color: "#fff", fontSize: 15, fontWeight: 700, margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
            Reset character
          </h3>
        </div>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, lineHeight: 1.5, margin: "0 0 14px" }}>
          Wipes all stats and history. Cannot be undone — export a backup first if you might want it back.
        </p>
        <button onClick={() => {
          if (confirm("Delete ALL stats and log entries? This cannot be undone.")) onResetAll();
        }} style={{
          width: "100%", padding: "11px 0",
          background: "rgba(255,107,107,0.15)", border: "1px solid rgba(255,107,107,0.4)",
          borderRadius: 12, color: "#FF9999", fontSize: 13, fontWeight: 700,
          cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
        }}>
          Reset everything
        </button>
      </div>

      <div style={{ marginTop: 24, textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
        Life RPG · data stays in your browser
      </div>
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  // Load synchronously to avoid flash. localStorage is sync.
  const [bootState] = useState(() => loadState());
  const [phase, setPhase] = useState(bootState.phase);
  const [xpMap, setXpMap] = useState(bootState.xpMap || {});
  const [log, setLog] = useState(bootState.log || []);
  const [apiKey, setApiKeyState] = useState(() => loadApiKey());

  const [recentGains, setRecentGains] = useState({});
  const [tab, setTab] = useState("stats");
  const recentTimer = useRef(null);

  // Persist whenever state changes
  useEffect(() => {
    saveState({ phase, xpMap, log });
  }, [phase, xpMap, log]);

  function handleQuestionnaireComplete(values) {
    const initialXp = initStats(values);
    setXpMap(initialXp);
    setPhase("app");
  }

  function handleTaskSubmit(result, taskText) {
    if (!result || !result.xp || Object.keys(result.xp).length === 0) return;
    setXpMap(prev => {
      const next = { ...prev };
      Object.entries(result.xp).forEach(([statId, xp]) => {
        next[statId] = (next[statId] || 0) + xp;
      });
      return next;
    });
    setRecentGains(result.xp);
    setLog(prev => [...prev, { task: taskText, xp: result.xp, ts: Date.now() }]);
    setTab("stats");
    if (recentTimer.current) clearTimeout(recentTimer.current);
    recentTimer.current = setTimeout(() => setRecentGains({}), 5000);
  }

  const handleUndoLast = useCallback(() => {
    setLog(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setXpMap(prevXp => {
        const next = { ...prevXp };
        Object.entries(last.xp).forEach(([statId, xp]) => {
          next[statId] = Math.max(0, (next[statId] || 0) - xp);
        });
        return next;
      });
      return prev.slice(0, -1);
    });
    setRecentGains({});
  }, []);

  const handleDeleteLogEntry = useCallback((index) => {
    setLog(prev => {
      const entry = prev[index];
      if (!entry) return prev;
      setXpMap(prevXp => {
        const next = { ...prevXp };
        Object.entries(entry.xp).forEach(([statId, xp]) => {
          next[statId] = Math.max(0, (next[statId] || 0) - xp);
        });
        return next;
      });
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  function handleSaveApiKey(k) {
    saveApiKey(k);
    setApiKeyState(k);
  }

  function handleExport() {
    exportToJson({ phase, xpMap, log });
  }

  async function handleImport(file) {
    const imported = await importFromFile(file);
    if (!confirm("Importing will replace your current stats and log. Continue?")) return;
    setXpMap(imported.xpMap);
    setLog(imported.log);
    setPhase("app");
    setTab("stats");
  }

  function handleResetAll() {
    clearState();
    setXpMap({});
    setLog([]);
    setRecentGains({});
    setPhase("questionnaire");
    setTab("stats");
  }

  if (phase === "questionnaire") {
    return <QuestionnaireScreen onComplete={handleQuestionnaireComplete} />;
  }

  const totalLevel = STATS.reduce((sum, s) => sum + getLevelFromXp(xpMap[s.id] || 0).level, 0);

  return (
    <div style={{
      minHeight: "100vh", background: "#0A0A0F",
      fontFamily: "'DM Sans', sans-serif", position: "relative",
    }}>
      {/* Stars */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            width: Math.random() * 1.5 + 0.5, height: Math.random() * 1.5 + 0.5,
            borderRadius: "50%", background: "rgba(255,255,255,0.3)",
            top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
            animation: `twinkle ${2 + Math.random() * 4}s infinite alternate`,
            animationDelay: `${Math.random() * 4}s`,
          }} />
        ))}
      </div>

      {/* Top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "rgba(10,10,15,0.9)", backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>⚔️</span>
          <span style={{ color: "#fff", fontSize: 18, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>Life RPG</span>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
          Lv. {totalLevel} total
        </div>
      </div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {tab === "stats" && <StatsTab xpMap={xpMap} recentGains={recentGains} />}
        {tab === "tasks" && (
          <TaskTab
            onSubmit={handleTaskSubmit}
            log={log}
            onDeleteLogEntry={handleDeleteLogEntry}
            onUndoLast={handleUndoLast}
            apiKey={apiKey}
            onOpenSettings={() => setTab("settings")}
          />
        )}
        {tab === "settings" && (
          <SettingsTab
            apiKey={apiKey}
            onSaveApiKey={handleSaveApiKey}
            onExport={handleExport}
            onImport={handleImport}
            onResetAll={handleResetAll}
          />
        )}
      </div>

      {/* Tab bar — has extra bottom padding to honor iOS home-indicator safe area */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 20,
        background: "rgba(10,10,15,0.95)", backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        display: "flex", padding: "8px 12px calc(16px + env(safe-area-inset-bottom))", gap: 8,
      }}>
        {[
          { id: "stats", icon: "📊", label: "Stats" },
          { id: "tasks", icon: "✅", label: "Log Task" },
          { id: "settings", icon: "⚙️", label: "Settings" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, background: tab === t.id ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.04)",
            border: tab === t.id ? "1px solid rgba(168,85,247,0.4)" : "1px solid rgba(255,255,255,0.07)",
            borderRadius: 14, padding: "10px 0", cursor: "pointer",
            color: tab === t.id ? "#a855f7" : "rgba(255,255,255,0.4)",
            fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
            transition: "all 0.2s", fontFamily: "'DM Sans', sans-serif",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
          }}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
