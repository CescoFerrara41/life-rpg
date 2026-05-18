import { useState, useEffect, useRef } from "react";
import { STATS, getLevelFromXp } from "./stats.js";
import {
  uidFromCode,
  fetchUser,
  addFriend,
  removeFriend,
  sendEncouragement,
  subscribeFriends,
  friendCodeFromUid,
} from "./firebase.js";

// ── MINI STAT BAR (for friend profiles) ──────────────────────────────────────

function MiniStatRow({ stat, xp }) {
  const info  = STATS.find(s => s.id === stat);
  const { level, currentXp, neededXp } = getLevelFromXp(xp);
  const pct = Math.min(100, Math.max(0, (currentXp / neededXp) * 100));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
      <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>{info.icon}</span>
      <span style={{ flex: 1, color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
        {info.label}
      </span>
      <div style={{ width: 80, background: "rgba(255,255,255,0.08)", borderRadius: 99, height: 4, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 99,
          background: `linear-gradient(90deg, ${info.color}88, ${info.color})`,
          width: `${pct}%`,
        }} />
      </div>
      <span style={{ width: 24, textAlign: "right", color: info.color, fontSize: 12, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>
        {level}
      </span>
    </div>
  );
}

// ── FRIEND CARD ───────────────────────────────────────────────────────────────

function FriendCard({ friend, currentUser, onRemove, onEncourage }) {
  const [expanded,    setExpanded]    = useState(false);
  const [encouraging, setEncouraging] = useState(false);
  const [encouraged,  setEncouraged]  = useState(false);

  const totalLevel = friend.totalLevel || 0;
  const topStats   = STATS
    .map(s => ({ ...s, xp: friend.xpMap?.[s.id] || 0 }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 3);

  async function handleEncourage() {
    if (encouraged || encouraging) return;
    setEncouraging(true);
    await onEncourage(friend.uid);
    setEncouraging(false);
    setEncouraged(true);
    setTimeout(() => setEncouraged(false), 30000);
  }

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 18, overflow: "hidden",
      transition: "border-color 0.2s",
    }}>
      {/* Header row */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" }}
      >
        {friend.photoURL
          ? <img src={friend.photoURL} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
          : <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "linear-gradient(135deg, #a855f7, #6366f1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 800, fontSize: 16, fontFamily: "'Space Grotesk', sans-serif",
            }}>{(friend.displayName || "?")[0].toUpperCase()}</div>
        }
        <div style={{ flex: 1 }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>
            {friend.displayName}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
            {topStats.map(s => (
              <span key={s.id} style={{ fontSize: 12 }}>{s.icon}</span>
            ))}
            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginLeft: 2, fontFamily: "'DM Sans', sans-serif" }}>
              top stats
            </span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 22, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1 }}>
            {totalLevel}
          </div>
          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, fontFamily: "'DM Sans', sans-serif" }}>
            total lv
          </div>
        </div>
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, marginLeft: 4 }}>
          {expanded ? "▲" : "▼"}
        </span>
      </div>

      {/* Expanded stats */}
      {expanded && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "12px 16px 0" }}>
          <div style={{ maxHeight: 320, overflowY: "auto", paddingBottom: 4 }}>
            {STATS.map(s => (
              <MiniStatRow key={s.id} stat={s.id} xp={friend.xpMap?.[s.id] || 0} />
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, padding: "12px 0 14px" }}>
            <button
              onClick={handleEncourage}
              disabled={encouraging}
              style={{
                flex: 1, padding: "10px 0",
                background: encouraged
                  ? "rgba(85,239,196,0.15)" : "rgba(168,85,247,0.15)",
                border: encouraged
                  ? "1px solid rgba(85,239,196,0.4)" : "1px solid rgba(168,85,247,0.3)",
                borderRadius: 12,
                color: encouraged ? "#55EFC4" : "#a855f7",
                fontSize: 13, fontWeight: 700, cursor: encouraging ? "default" : "pointer",
                fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.3s",
              }}
            >
              {encouraged ? "✓ Encouraged!" : encouraging ? "Sending…" : "⚡ Encourage"}
            </button>
            <button
              onClick={() => { if (confirm(`Remove ${friend.displayName} as a friend?`)) onRemove(friend.uid); }}
              style={{
                padding: "10px 14px",
                background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)",
                borderRadius: 12, color: "rgba(255,150,150,0.8)",
                fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              }}
            >Remove</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── FRIENDS TAB ───────────────────────────────────────────────────────────────

export default function FriendsTab({ currentUser, myData }) {
  const [friends,        setFriends]        = useState({});   // uid → userData
  const [codeInput,      setCodeInput]      = useState("");
  const [addStatus,      setAddStatus]      = useState("");   // "", "loading", "success", "error:<msg>"
  const [copied,         setCopied]         = useState(false);
  const unsubRef = useRef(null);

  const myFriendUids = myData?.friends || [];
  const myCode       = myData ? friendCodeFromUid(myData.uid) : "—";

  // Subscribe to all friends' documents in real time
  useEffect(() => {
    if (unsubRef.current) unsubRef.current();
    if (!myFriendUids.length) { setFriends({}); return; }

    const perFriendUnsubs = myFriendUids.map(uid =>
      subscribeFriends([uid], (fuid, data) => {
        setFriends(prev => ({ ...prev, [fuid]: data }));
      })
    );
    unsubRef.current = () => perFriendUnsubs.forEach(u => u());
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, [myFriendUids.join(",")]);

  async function handleAddFriend() {
    const code = codeInput.trim().toUpperCase();
    if (!code || code.length !== 6) {
      setAddStatus("error:Enter a 6-character friend code.");
      return;
    }
    if (code === myCode) {
      setAddStatus("error:That's your own code!");
      return;
    }
    setAddStatus("loading");
    try {
      const theirUid = await uidFromCode(code);
      if (!theirUid) { setAddStatus("error:Code not found. Check it and try again."); return; }
      if (myFriendUids.includes(theirUid)) { setAddStatus("error:Already friends!"); return; }
      await addFriend(currentUser.uid, theirUid);
      setCodeInput("");
      setAddStatus("success");
      setTimeout(() => setAddStatus(""), 2500);
    } catch (e) {
      setAddStatus("error:Something went wrong. Try again.");
    }
  }

  async function handleRemove(theirUid) {
    await removeFriend(currentUser.uid, theirUid);
    setFriends(prev => { const n = { ...prev }; delete n[theirUid]; return n; });
  }

  async function handleEncourage(toUid) {
    await sendEncouragement(currentUser, toUid);
  }

  function copyCode() {
    navigator.clipboard.writeText(myCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const friendList = myFriendUids
    .map(uid => friends[uid])
    .filter(Boolean)
    .sort((a, b) => (b.totalLevel || 0) - (a.totalLevel || 0));

  const isError   = addStatus.startsWith("error:");
  const errMsg    = isError ? addStatus.slice(6) : "";

  return (
    <div style={{ padding: "16px 16px 100px" }}>

      {/* MY FRIEND CODE */}
      <div style={{
        background: "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(99,102,241,0.1))",
        border: "1px solid rgba(168,85,247,0.3)",
        borderRadius: 20, padding: 20, marginBottom: 16,
      }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>
          Your friend code
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            fontSize: 28, fontWeight: 900, letterSpacing: 6, color: "#fff",
            fontFamily: "'Space Grotesk', sans-serif", flex: 1,
          }}>{myCode}</div>
          <button onClick={copyCode} style={{
            background: copied ? "rgba(85,239,196,0.2)" : "rgba(255,255,255,0.1)",
            border: copied ? "1px solid rgba(85,239,196,0.4)" : "1px solid rgba(255,255,255,0.15)",
            borderRadius: 12, padding: "10px 16px",
            color: copied ? "#55EFC4" : "#fff",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
          }}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 8, fontFamily: "'DM Sans', sans-serif" }}>
          Share this with friends so they can add you.
        </div>
      </div>

      {/* ADD A FRIEND */}
      <div style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 18, padding: 18, marginBottom: 20,
      }}>
        <h3 style={{ color: "#fff", fontSize: 14, fontWeight: 700, margin: "0 0 12px", fontFamily: "'Space Grotesk', sans-serif" }}>
          Add a friend
        </h3>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={codeInput}
            onChange={e => { setCodeInput(e.target.value.toUpperCase().slice(0, 6)); setAddStatus(""); }}
            placeholder="FRIEND CODE"
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            style={{
              flex: 1, background: "rgba(0,0,0,0.3)",
              border: `1px solid ${isError ? "rgba(255,107,107,0.5)" : "rgba(255,255,255,0.12)"}`,
              borderRadius: 12, color: "#fff",
              padding: "11px 14px", fontSize: 16, letterSpacing: 4,
              fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif",
              outline: "none", textTransform: "uppercase",
            }}
          />
          <button
            onClick={handleAddFriend}
            disabled={addStatus === "loading"}
            style={{
              padding: "11px 18px",
              background: addStatus === "success"
                ? "rgba(85,239,196,0.2)"
                : "linear-gradient(135deg, #a855f7, #6366f1)",
              border: "none", borderRadius: 12,
              color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: addStatus === "loading" ? "default" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {addStatus === "loading" ? "…" : addStatus === "success" ? "✓" : "Add"}
          </button>
        </div>
        {isError && (
          <div style={{ marginTop: 8, fontSize: 12, color: "#FF9999", fontFamily: "'DM Sans', sans-serif" }}>
            {errMsg}
          </div>
        )}
        {addStatus === "success" && (
          <div style={{ marginTop: 8, fontSize: 12, color: "#55EFC4", fontFamily: "'DM Sans', sans-serif" }}>
            Friend added! ⚔️
          </div>
        )}
      </div>

      {/* FRIENDS LIST */}
      {myFriendUids.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🗡️</div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>
            No friends yet. Share your code to get started.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>
            {myFriendUids.length} {myFriendUids.length === 1 ? "friend" : "friends"}
          </div>
          {friendList.map(friend => (
            <FriendCard
              key={friend.uid}
              friend={friend}
              currentUser={currentUser}
              onRemove={handleRemove}
              onEncourage={handleEncourage}
            />
          ))}
          {/* Pending friends not yet loaded */}
          {myFriendUids.filter(uid => !friends[uid]).map(uid => (
            <div key={uid} style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 18, padding: "16px 18px",
              color: "rgba(255,255,255,0.25)", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
            }}>Loading…</div>
          ))}
        </div>
      )}
    </div>
  );
}