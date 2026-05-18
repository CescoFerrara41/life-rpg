import { useState, useEffect, useRef, useCallback } from "react";
import {
  STATS, QUESTIONS, getLevelFromXp, initStats,
} from "./stats.js";
import { analyzeTask, PROVIDERS } from "./api.js";
import {
  loadState, saveState, clearState,
  loadProvider, saveProvider, loadKeys, saveKey,
  exportToJson, importFromFile,
} from "./storage.js";
import {
  signInWithGoogle, signOutUser,
  syncXpMap, clearEncouragements,
  friendCodeFromUid,
  FIREBASE_CONFIGURED,
} from "./firebase.js";
import { useAuth } from "./useAuth.js";
import FriendsTab from "./FriendsTab.jsx";

// ── PRIMITIVES ────────────────────────────────────────────────────────────────

function XPBar({ current, needed, color, animated }) {
  const isNeg = current < 0;
  const pct = isNeg
    ? Math.min(100, (Math.abs(current) / needed) * 100)
    : Math.min(100, (current / needed) * 100);
  const barColor = isNeg ? "#FF6B6B" : color;
  return (
    <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 99, height: 6, overflow: "hidden" }}>
      <div style={{
        height: "100%", borderRadius: 99,
        background: `linear-gradient(90deg, ${barColor}99, ${barColor})`,
        width: `${pct}%`,
        transition: animated ? "width 0.8s cubic-bezier(0.23,1,0.32,1)" : "none",
        boxShadow: `0 0 8px ${barColor}88`,
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

// ── SIGN-IN SCREEN ────────────────────────────────────────────────────────────

function SignInScreen({ onSignIn, loading }) {
  return (
    <div style={{
      minHeight: "100vh", background: "#0A0A0F",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "0 32px", fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Stars */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            width: Math.random() * 2 + 1, height: Math.random() * 2 + 1,
            borderRadius: "50%", background: "rgba(255,255,255,0.35)",
            top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
            animation: `twinkle ${2 + Math.random() * 3}s infinite alternate`,
            animationDelay: `${Math.random() * 3}s`,
          }} />
        ))}
      </div>
      <div style={{ textAlign: "center", position: "relative" }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>⚔️</div>
        <h1 style={{ color: "#fff", fontSize: 32, fontWeight: 900, margin: "0 0 8px", fontFamily: "'Space Grotesk', sans-serif" }}>
          Life RPG
        </h1>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 15, margin: "0 0 40px", lineHeight: 1.5 }}>
          Level up your real life.<br/>Sign in to sync progress and connect with friends.
        </p>
        <button
          onClick={onSignIn}
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
            width: "100%", maxWidth: 320, margin: "0 auto",
            padding: "16px 24px",
            background: loading ? "rgba(255,255,255,0.06)" : "#fff",
            border: "none", borderRadius: 16,
            color: loading ? "rgba(255,255,255,0.4)" : "#000",
            fontSize: 15, fontWeight: 700, cursor: loading ? "default" : "pointer",
            fontFamily: "'DM Sans', sans-serif",
            boxShadow: loading ? "none" : "0 4px 24px rgba(255,255,255,0.15)",
            transition: "all 0.2s",
          }}
        >
          {/* Google G logo */}
          {!loading && (
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
          )}
          {loading ? "Signing in…" : "Continue with Google"}
        </button>
        <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, marginTop: 20 }}>
          Your data syncs across devices. Friends can see your stats, not your log.
        </p>
      </div>
    </div>
  );
}

// ── QUESTIONNAIRE ─────────────────────────────────────────────────────────────

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
  function back() { if (step > 0) setStep(s => s - 1); }
  function skip() { onComplete({}); }

  return (
    <div style={{
      minHeight: "100vh", background: "#0A0A0F",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "0 24px", fontFamily: "'DM Sans', sans-serif",
    }}>
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
          <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 900, margin: "0 0 4px", fontFamily: "'Space Grotesk', sans-serif" }}>Life RPG</h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: 0 }}>
            Character creation — {step + 1} of {QUESTIONS.length}
          </p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 99, height: 4, marginBottom: 32, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 99,
            background: `linear-gradient(90deg, ${info.color}, ${info.color}cc)`,
            width: `${((step + 1) / QUESTIONS.length) * 100}%`,
            transition: "width 0.5s ease", boxShadow: `0 0 10px ${info.color}`,
          }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: 28 }}>
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
          <div style={{ margin: "24px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{q.min}</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: info.color, fontFamily: "'Space Grotesk', sans-serif" }}>{val}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{q.max}</span>
            </div>
            <input type="range" min={0} max={100} value={val}
              onChange={e => setValues(v => ({ ...v, [q.stat]: +e.target.value }))}
              style={{ width: "100%", accentColor: info.color, cursor: "pointer" }} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {step > 0 && (
              <button onClick={back} style={{
                flex: "0 0 auto", padding: "14px 18px",
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 14, color: "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: 600,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              }}>←</button>
            )}
            <button onClick={next} style={{
              flex: 1, padding: "14px 0",
              background: `linear-gradient(135deg, ${info.color}, ${info.color}bb)`,
              border: "none", borderRadius: 14, color: "#000",
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              boxShadow: `0 4px 20px ${info.color}44`, fontFamily: "'DM Sans', sans-serif",
            }}>
              {step < QUESTIONS.length - 1 ? "Next →" : "Begin Adventure ⚔️"}
            </button>
          </div>
        </div>
        <button onClick={skip} style={{
          marginTop: 16, background: "none", border: "none",
          color: "rgba(255,255,255,0.25)", fontSize: 13, cursor: "pointer", width: "100%",
        }}>Skip questionnaire (start at 0)</button>
      </div>
    </div>
  );
}

// ── STATS TAB ─────────────────────────────────────────────────────────────────

function StatsTab({ xpMap, recentGains }) {
  const [search, setSearch] = useState("");
  const [sort, setSort]     = useState("level");

  const filtered = STATS
    .filter(s => s.label.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "level")  return getLevelFromXp(xpMap[b.id] || 0).level - getLevelFromXp(xpMap[a.id] || 0).level;
      if (sort === "name")   return a.label.localeCompare(b.label);
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
        <input placeholder="🔍  Search stats…" value={search} onChange={e => setSearch(e.target.value)} style={{
          flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12, color: "#fff", padding: "10px 14px", fontSize: 13,
          outline: "none", fontFamily: "'DM Sans', sans-serif",
        }} />
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
          <StatCard key={stat.id} stat={stat.id} xp={xpMap[stat.id] || 0} highlight={!!(recentGains[stat.id])} />
        ))}
      </div>
    </div>
  );
}

// ── TASK TAB ──────────────────────────────────────────────────────────────────

function TaskTab({ onSubmit, log, onDeleteLogEntry, onUndoLast, provider, keys, onOpenSettings }) {
  const [task, setTask]     = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState("");

  const providerInfo = PROVIDERS[provider];
  const activeKey    = keys[provider];

  async function handleSubmit() {
    if (!task.trim() || loading) return;
    if (!activeKey) { setError(`Set your ${providerInfo.name} API key in Settings first.`); return; }
    setLoading(true); setResult(null); setError("");
    const r = await analyzeTask(task, provider, keys);
    setResult(r);
    if (r.error) {
      setError(r.summary || "Something went wrong.");
    } else if (!r.xp || Object.keys(r.xp).length === 0) {
      setError(r.summary || "This task doesn't match any tracked stat. No XP awarded.");
    } else {
      onSubmit(r, task);
    }
    setLoading(false);
    if (!r.error && r.xp && Object.keys(r.xp).length > 0) setTask("");
  }

  return (
    <div style={{ padding: "16px 16px 100px" }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "0 0 4px", fontFamily: "'Space Grotesk', sans-serif" }}>Log Achievement</h2>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: 0 }}>
          Describe what you accomplished — {providerInfo.name} will award XP.
        </p>
      </div>
      {!activeKey && (
        <div style={{
          background: "rgba(253,203,110,0.1)", border: "1px solid rgba(253,203,110,0.3)",
          borderRadius: 14, padding: "12px 14px", marginBottom: 12,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        }}>
          <div style={{ fontSize: 12, color: "#FDCB6E", lineHeight: 1.4 }}>
            Add your {providerInfo.name} API key in Settings to enable XP analysis.
          </div>
          <button onClick={onOpenSettings} style={{
            background: "#FDCB6E", border: "none", borderRadius: 10,
            padding: "8px 14px", color: "#000", fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap",
          }}>Open Settings</button>
        </div>
      )}
      <div style={{
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 20, padding: 16, marginBottom: 12,
      }}>
        <textarea value={task} onChange={e => setTask(e.target.value)}
          placeholder="e.g. 'Studied Japanese for 3 hours', 'Ran a 10K', 'Was diagnosed with cancer'…"
          rows={4} style={{
            width: "100%", background: "none", border: "none", outline: "none",
            color: "#fff", fontSize: 14, resize: "none", lineHeight: 1.6,
            fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box",
          }} />
      </div>
      <button onClick={handleSubmit} disabled={!task.trim() || loading} style={{
        width: "100%", padding: "15px 0",
        background: task.trim() && !loading ? "linear-gradient(135deg, #a855f7, #6366f1)" : "rgba(255,255,255,0.08)",
        border: "none", borderRadius: 16,
        color: task.trim() && !loading ? "#fff" : "rgba(255,255,255,0.3)",
        fontSize: 15, fontWeight: 700, cursor: task.trim() && !loading ? "pointer" : "default",
        transition: "all 0.3s",
        boxShadow: task.trim() && !loading ? "0 4px 24px rgba(168,85,247,0.4)" : "none",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {loading ? `⚙️  Analyzing via ${providerInfo.name}…` : "⚔️  Submit Event"}
      </button>
      {error && (
        <div style={{
          marginTop: 14, background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.25)",
          borderRadius: 14, padding: "12px 14px", color: "#FF9999", fontSize: 13, lineHeight: 1.5,
        }}>{error}</div>
      )}
      {result && !result.error && result.xp && Object.keys(result.xp).length > 0 && (() => {
        const allNeg = Object.values(result.xp).every(v => v < 0);
        return (
          <div style={{
            marginTop: 20,
            background: allNeg
              ? "linear-gradient(135deg, rgba(255,107,107,0.15), rgba(200,50,50,0.08))"
              : "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(99,102,241,0.1))",
            border: allNeg ? "1px solid rgba(255,107,107,0.35)" : "1px solid rgba(168,85,247,0.3)",
            borderRadius: 20, padding: 20, animation: "slideUp 0.4s ease",
          }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 14, lineHeight: 1.5 }}>
              {result.summary}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Object.entries(result.xp).map(([statId, xp]) => {
                const info = STATS.find(s => s.id === statId);
                if (!info) return null;
                const isNeg = xp < 0;
                return (
                  <div key={statId} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: isNeg ? "rgba(255,107,107,0.08)" : `${info.color}11`,
                    border: isNeg ? "1px solid rgba(255,107,107,0.25)" : `1px solid ${info.color}33`,
                    borderRadius: 12, padding: "10px 14px",
                  }}>
                    <span style={{ fontSize: 18 }}>{info.icon}</span>
                    <span style={{ flex: 1, color: "#fff", fontSize: 13, fontWeight: 600 }}>{info.label}</span>
                    <span style={{ color: isNeg ? "#FF9999" : info.color, fontWeight: 800, fontSize: 16, fontFamily: "'Space Grotesk', sans-serif" }}>
                      {xp > 0 ? `+${xp}` : xp} XP
                    </span>
                  </div>
                );
              })}
            </div>
            <button onClick={() => { onUndoLast(); setResult(null); }} style={{
              marginTop: 14, width: "100%",
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12, padding: "10px 0", color: "rgba(255,255,255,0.7)",
              fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}>Undo</button>
          </div>
        );
      })()}
      {log.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, textTransform: "uppercase", letterSpacing: 1, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
              Recent Events
            </h3>
            <button onClick={onUndoLast} style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10, padding: "5px 10px", color: "rgba(255,255,255,0.6)",
              fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}>↶ Undo last</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...log].reverse().slice(0, 20).map((entry, i) => {
              const realIdx = log.length - 1 - i;
              return (
                <div key={entry.ts || realIdx} style={{
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 14, padding: "12px 14px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                    <div style={{ color: "#fff", fontSize: 13, fontWeight: 500, flex: 1 }}>{entry.task}</div>
                    <button onClick={() => { if (confirm("Delete this entry? This will adjust your XP.")) onDeleteLogEntry(realIdx); }}
                      style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 16, padding: 0 }}
                      aria-label="Delete entry">×</button>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {Object.entries(entry.xp).map(([sid, xp]) => {
                      const info = STATS.find(s => s.id === sid);
                      if (!info) return null;
                      return (
                        <span key={sid} style={{
                          background: xp < 0 ? "rgba(255,107,107,0.15)" : `${info.color}22`,
                          color: xp < 0 ? "#FF9999" : info.color,
                          borderRadius: 8, padding: "3px 8px", fontSize: 11, fontWeight: 700,
                        }}>{info.icon} {xp > 0 ? `+${xp}` : xp}</span>
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

// ── SETTINGS TAB ──────────────────────────────────────────────────────────────

function ApiKeyPanel({ providerInfo, currentKey, onSave }) {
  const [input, setInput] = useState(currentKey || "");
  const [show, setShow]   = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => { setInput(currentKey || ""); }, [currentKey]);
  function save() { onSave(providerInfo.id, input.trim()); setSaved(true); setTimeout(() => setSaved(false), 1500); }
  function clear() { setInput(""); onSave(providerInfo.id, ""); }
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.5, marginBottom: 10 }}>
        Get your key at{" "}
        <a href={providerInfo.link} target="_blank" rel="noopener noreferrer" style={{ color: "#a855f7", textDecoration: "none" }}>
          {providerInfo.linkLabel}
        </a>. {providerInfo.keyHint}. Stored only on this device.
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input type={show ? "text" : "password"} value={input} onChange={e => setInput(e.target.value)}
          placeholder={providerInfo.placeholder}
          autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
          style={{
            flex: 1, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12, color: "#fff", padding: "10px 12px", fontSize: 13,
            outline: "none", fontFamily: "monospace",
          }} />
        <button onClick={() => setShow(s => !s)} style={{
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12, padding: "0 12px", color: "rgba(255,255,255,0.7)",
          fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
        }}>{show ? "Hide" : "Show"}</button>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={save} disabled={!input.trim()} style={{
          flex: 1, padding: "11px 0",
          background: input.trim() ? "linear-gradient(135deg, #a855f7, #6366f1)" : "rgba(255,255,255,0.06)",
          border: "none", borderRadius: 12,
          color: input.trim() ? "#fff" : "rgba(255,255,255,0.3)",
          fontSize: 13, fontWeight: 700, cursor: input.trim() ? "pointer" : "default",
          fontFamily: "'DM Sans', sans-serif",
        }}>{saved ? "✓ Saved" : "Save key"}</button>
        {currentKey && (
          <button onClick={clear} style={{
            padding: "11px 16px", background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.3)",
            borderRadius: 12, color: "#FF9999", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          }}>Clear</button>
        )}
      </div>
      {currentKey && <div style={{ marginTop: 8, fontSize: 11, color: "rgba(85,239,196,0.8)" }}>✓ {providerInfo.storedMsg}</div>}
    </div>
  );
}

function SettingsTab({ provider, keys, onSetProvider, onSaveKey, onExport, onImport, onResetAll, authUser, myData, onSignOut }) {
  const [importErr, setImportErr] = useState("");
  const fileRef = useRef(null);
  const otherId = provider === "gemini" ? "claude" : "gemini";
  const other   = PROVIDERS[otherId];
  const [otherOpen, setOtherOpen] = useState(false);

  async function handleFile(e) {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return; setImportErr("");
    try { await onImport(f); } catch (err) { setImportErr(err.message || "Could not import file."); }
  }

  return (
    <div style={{ padding: "16px 16px 100px" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "0 0 4px", fontFamily: "'Space Grotesk', sans-serif" }}>Settings</h2>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: 0 }}>Account, AI provider, API keys, and data.</p>
      </div>

      {/* ACCOUNT */}
      {authUser && (
        <div style={{
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 18, padding: 18, marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {authUser.photoURL
              ? <img src={authUser.photoURL} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} />
              : <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, #a855f7, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 18 }}>{(authUser.displayName || "?")[0]}</div>
            }
            <div style={{ flex: 1 }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>{authUser.displayName}</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>{authUser.email}</div>
              {myData?.friendCode && (
                <div style={{ color: "#a855f7", fontSize: 11, fontWeight: 700, marginTop: 2, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: 2 }}>
                  CODE: {myData.friendCode}
                </div>
              )}
            </div>
            <button onClick={onSignOut} style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10, padding: "8px 14px", color: "rgba(255,255,255,0.6)",
              fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}>Sign out</button>
          </div>
        </div>
      )}

      {/* AI PROVIDER */}
      <div style={{
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 18, padding: 18, marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 20 }}>🤖</span>
          <h3 style={{ color: "#fff", fontSize: 15, fontWeight: 700, margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>AI Provider</h3>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {Object.values(PROVIDERS).map(p => {
            const active = provider === p.id;
            const hasKey = !!keys[p.id];
            return (
              <button key={p.id} onClick={() => onSetProvider(p.id)} style={{
                flex: 1, padding: "14px 10px",
                background: active ? "rgba(168,85,247,0.18)" : "rgba(255,255,255,0.04)",
                border: active ? "2px solid rgba(168,85,247,0.6)" : "2px solid rgba(255,255,255,0.08)",
                borderRadius: 16, cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                transition: "all 0.2s",
                boxShadow: active ? "0 0 20px rgba(168,85,247,0.2)" : "none",
              }}>
                <span style={{ fontSize: 26 }}>{p.icon}</span>
                <span style={{ color: active ? "#fff" : "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{p.name}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: p.badgeColor, background: `${p.badgeColor}22`, padding: "2px 8px", borderRadius: 99, fontFamily: "'DM Sans', sans-serif" }}>{p.badge}</span>
                <span style={{ fontSize: 10, color: hasKey ? "rgba(85,239,196,0.8)" : "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif" }}>{hasKey ? "✓ key set" : "no key"}</span>
              </button>
            );
          })}
        </div>
        <ApiKeyPanel providerInfo={PROVIDERS[provider]} currentKey={keys[provider]} onSave={onSaveKey} />
      </div>

      {/* SECONDARY PROVIDER */}
      <div style={{
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 18, padding: "14px 18px", marginBottom: 16,
      }}>
        <button onClick={() => setOtherOpen(o => !o)} style={{
          background: "none", border: "none", cursor: "pointer", width: "100%",
          display: "flex", alignItems: "center", justifyContent: "space-between", padding: 0,
        }}>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
            {other.icon} {other.name} key {keys[otherId] ? "✓" : "(not set)"}
          </span>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>{otherOpen ? "▲" : "▼"}</span>
        </button>
        {otherOpen && <ApiKeyPanel providerInfo={other} currentKey={keys[otherId]} onSave={onSaveKey} />}
      </div>

      {/* BACKUP */}
      <div style={{
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 18, padding: 18, marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 20 }}>💾</span>
          <h3 style={{ color: "#fff", fontSize: 15, fontWeight: 700, margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>Backup</h3>
        </div>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, lineHeight: 1.5, margin: "0 0 14px" }}>
          Save stats & log as JSON, or restore from one. API keys are never included.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onExport} style={{
            flex: 1, padding: "11px 0", background: "rgba(85,239,196,0.1)", border: "1px solid rgba(85,239,196,0.3)",
            borderRadius: 12, color: "#55EFC4", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          }}>↓ Export</button>
          <button onClick={() => fileRef.current?.click()} style={{
            flex: 1, padding: "11px 0", background: "rgba(116,185,255,0.1)", border: "1px solid rgba(116,185,255,0.3)",
            borderRadius: 12, color: "#74B9FF", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          }}>↑ Import</button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleFile} style={{ display: "none" }} />
        </div>
        {importErr && <div style={{ marginTop: 10, fontSize: 11, color: "#FF9999" }}>Import failed: {importErr}</div>}
      </div>

      {/* RESET */}
      <div style={{ background: "rgba(255,107,107,0.04)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: 18, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <h3 style={{ color: "#fff", fontSize: 15, fontWeight: 700, margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>Reset character</h3>
        </div>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, lineHeight: 1.5, margin: "0 0 14px" }}>
          Wipes all stats and history. Export a backup first.
        </p>
        <button onClick={() => { if (confirm("Delete ALL stats and log entries? This cannot be undone.")) onResetAll(); }} style={{
          width: "100%", padding: "11px 0", background: "rgba(255,107,107,0.15)", border: "1px solid rgba(255,107,107,0.4)",
          borderRadius: 12, color: "#FF9999", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
        }}>Reset everything</button>
      </div>
      <div style={{ marginTop: 24, textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.25)" }}>Life RPG · synced with Firebase</div>
    </div>
  );
}

// ── ENCOURAGEMENT TOAST ───────────────────────────────────────────────────────

function EncouragementToast({ encouragements, onDismiss }) {
  const entries = Object.entries(encouragements || {});
  if (!entries.length) return null;
  const latest = entries.sort((a, b) => b[1].ts - a[1].ts)[0][1];
  return (
    <div style={{
      position: "fixed", top: "calc(70px + env(safe-area-inset-top))", left: 16, right: 16, zIndex: 50,
      background: "linear-gradient(135deg, rgba(168,85,247,0.95), rgba(99,102,241,0.95))",
      borderRadius: 16, padding: "14px 16px",
      display: "flex", alignItems: "center", gap: 12,
      boxShadow: "0 8px 32px rgba(168,85,247,0.4)",
      animation: "slideUp 0.3s ease",
    }}>
      <span style={{ fontSize: 24 }}>⚡</span>
      <div style={{ flex: 1 }}>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
          {latest.name} encouraged you!
        </div>
        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>
          Keep going — you've got a friend cheering for you.
        </div>
      </div>
      <button onClick={onDismiss} style={{
        background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8,
        color: "#fff", fontSize: 12, fontWeight: 700, padding: "6px 10px",
        cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
      }}>✓</button>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────

export default function App() {
  const [bootState]      = useState(() => loadState());
  const [phase, setPhase]         = useState(bootState.phase);
  const [xpMap, setXpMap]         = useState(bootState.xpMap || {});
  const [log, setLog]             = useState(bootState.log   || []);
  const [provider, setProviderState] = useState(() => loadProvider());
  const [keys, setKeysState]      = useState(() => loadKeys());
  const [recentGains, setRecentGains] = useState({});
  const [tab, setTab]             = useState("stats");
  const [signInLoading, setSignInLoading] = useState(false);
  const recentTimer = useRef(null);
  const syncTimer   = useRef(null);

  const { authUser, myData, firebaseError } = useAuth(xpMap);

  // Persist locally on every change
  useEffect(() => { saveState({ phase, xpMap, log }); }, [phase, xpMap, log]);

  // Debounced sync to Firestore (500ms after last change)
  useEffect(() => {
    if (!authUser) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      syncXpMap(authUser.uid, xpMap).catch(console.warn);
    }, 500);
    return () => clearTimeout(syncTimer.current);
  }, [authUser?.uid, xpMap]);

  async function handleSignIn() {
    setSignInLoading(true);
    try { await signInWithGoogle(); }
    catch (e) { console.warn("Sign-in failed:", e); }
    setSignInLoading(false);
  }

  async function handleSignOut() {
    await signOutUser();
  }

  function handleQuestionnaireComplete(values) {
    setXpMap(initStats(values));
    setPhase("app");
  }

  function handleTaskSubmit(result, taskText) {
    if (!result?.xp || Object.keys(result.xp).length === 0) return;
    setXpMap(prev => {
      const next = { ...prev };
      Object.entries(result.xp).forEach(([sid, xp]) => { next[sid] = (next[sid] || 0) + xp; });
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
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      setXpMap(px => {
        const next = { ...px };
        Object.entries(last.xp).forEach(([sid, xp]) => { next[sid] = (next[sid] || 0) - xp; });
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
      setXpMap(px => {
        const next = { ...px };
        Object.entries(entry.xp).forEach(([sid, xp]) => { next[sid] = (next[sid] || 0) - xp; });
        return next;
      });
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  function handleSetProvider(p) { saveProvider(p); setProviderState(p); }
  function handleSaveKey(pid, key) { saveKey(pid, key); setKeysState(prev => ({ ...prev, [pid]: key })); }
  function handleExport() { exportToJson({ phase, xpMap, log }); }

  async function handleImport(file) {
    const imported = await importFromFile(file);
    if (!confirm("Importing will replace your current stats and log. Continue?")) return;
    setXpMap(imported.xpMap); setLog(imported.log);
    setPhase("app"); setTab("stats");
  }

  function handleResetAll() {
    clearState();
    setXpMap({}); setLog([]); setRecentGains({});
    setPhase("questionnaire"); setTab("stats");
  }

  async function handleDismissEncouragements() {
    if (authUser) await clearEncouragements(authUser.uid).catch(console.warn);
  }

  // ── Firebase not configured yet ─────────────────────────────────────────
  if (!FIREBASE_CONFIGURED || firebaseError) {
    return (
      <div style={{
        minHeight: "100vh", background: "#0A0A0F",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "0 28px", fontFamily: "'DM Sans', sans-serif", textAlign: "center",
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔧</div>
        <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 20, margin: "0 0 12px", fontFamily: "'Space Grotesk', sans-serif" }}>
          Firebase not configured
        </h2>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, lineHeight: 1.6, margin: "0 0 20px", maxWidth: 320 }}>
          Open <code style={{ color: "#a855f7" }}>src/firebase.js</code> and paste your Firebase project config where it says <code style={{ color: "#a855f7" }}>PASTE_YOUR_…</code>.
        </p>
        <div style={{
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 14, padding: "14px 18px", maxWidth: 360, width: "100%", textAlign: "left",
        }}>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>Steps</div>
          {[
            "Go to console.firebase.google.com",
            "Create a project → Add a Web app",
            "Copy the firebaseConfig object",
            "Paste into src/firebase.js",
            "Enable Google sign-in & Firestore",
            "Add your GitHub Pages domain to Authorized Domains",
            "Push to GitHub to redeploy",
          ].map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
              <span style={{ color: "#a855f7", fontWeight: 800, fontSize: 12, minWidth: 18, fontFamily: "'Space Grotesk', sans-serif" }}>{i + 1}.</span>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }}>{step}</span>
            </div>
          ))}
        </div>
        {firebaseError && (
          <div style={{ marginTop: 16, color: "#FF9999", fontSize: 11, maxWidth: 320 }}>
            Error: {firebaseError}
          </div>
        )}
      </div>
    );
  }

  // ── Loading state (Firebase auth initializing) ───────────────────────────
  if (authUser === undefined) {
    return (
      <div style={{ minHeight: "100vh", background: "#0A0A0F", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>Loading…</div>
      </div>
    );
  }

  // ── Not signed in ────────────────────────────────────────────────────────
  if (!authUser) {
    return <SignInScreen onSignIn={handleSignIn} loading={signInLoading} />;
  }

  // ── Questionnaire ────────────────────────────────────────────────────────
  if (phase === "questionnaire") {
    return <QuestionnaireScreen onComplete={handleQuestionnaireComplete} />;
  }

  const totalLevel   = STATS.reduce((sum, s) => sum + getLevelFromXp(xpMap[s.id] || 0).level, 0);
  const providerInfo = PROVIDERS[provider];
  const encouragements     = myData?.encouragements || {};
  const hasEncouragements  = Object.keys(encouragements).length > 0;
  const friendCount        = myData?.friends?.length || 0;

  const TABS = [
    { id: "stats",    icon: "📊", label: "Stats"    },
    { id: "tasks",    icon: "✅", label: "Log"       },
    { id: "friends",  icon: "🗡️", label: "Friends", badge: friendCount },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F", fontFamily: "'DM Sans', sans-serif", position: "relative" }}>
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

      {/* Encouragement toast */}
      {hasEncouragements && (
        <EncouragementToast encouragements={encouragements} onDismiss={handleDismissEncouragements} />
      )}

      {/* Top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "rgba(10,10,15,0.9)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>⚔️</span>
          <span style={{ color: "#fff", fontSize: 18, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>Life RPG</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {authUser.photoURL
            ? <img src={authUser.photoURL} alt="" style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }} />
            : null
          }
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Lv. {totalLevel}</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {tab === "stats"    && <StatsTab xpMap={xpMap} recentGains={recentGains} />}
        {tab === "tasks"    && (
          <TaskTab
            onSubmit={handleTaskSubmit} log={log}
            onDeleteLogEntry={handleDeleteLogEntry} onUndoLast={handleUndoLast}
            provider={provider} keys={keys} onOpenSettings={() => setTab("settings")}
          />
        )}
        {tab === "friends"  && <FriendsTab currentUser={authUser} myData={myData} />}
        {tab === "settings" && (
          <SettingsTab
            provider={provider} keys={keys}
            onSetProvider={handleSetProvider} onSaveKey={handleSaveKey}
            onExport={handleExport} onImport={handleImport} onResetAll={handleResetAll}
            authUser={authUser} myData={myData} onSignOut={handleSignOut}
          />
        )}
      </div>

      {/* Tab bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 20,
        background: "rgba(10,10,15,0.95)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        display: "flex", padding: "8px 12px calc(16px + env(safe-area-inset-bottom))", gap: 8,
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, position: "relative",
            background: tab === t.id ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.04)",
            border: tab === t.id ? "1px solid rgba(168,85,247,0.4)" : "1px solid rgba(255,255,255,0.07)",
            borderRadius: 14, padding: "10px 0", cursor: "pointer",
            color: tab === t.id ? "#a855f7" : "rgba(255,255,255,0.4)",
            fontSize: 11, fontWeight: tab === t.id ? 700 : 500,
            transition: "all 0.2s", fontFamily: "'DM Sans', sans-serif",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
          }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            <span>{t.label}</span>
            {t.id === "friends" && hasEncouragements && (
              <div style={{
                position: "absolute", top: 6, right: "50%", transform: "translateX(10px)",
                width: 8, height: 8, borderRadius: "50%",
                background: "#a855f7", boxShadow: "0 0 6px #a855f7",
              }} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}