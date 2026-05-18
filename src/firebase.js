// ─────────────────────────────────────────────────────────────────────────────
// FIREBASE CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
// 1. Go to https://console.firebase.google.com
// 2. Create a project (or open an existing one)
// 3. Project Settings → Your apps → Add app → Web (</>)
// 4. Copy the firebaseConfig object values below
// 5. Authentication → Sign-in method → Google → Enable
// 6. Firestore Database → Create database → Start in test mode
// 7. Authentication → Settings → Authorized domains → add your GitHub Pages domain
//    e.g.  YOUR-USERNAME.github.io
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from "firebase/firestore";

// ── PASTE YOUR CONFIG HERE ───────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "PASTE_YOUR_API_KEY_HERE",
  authDomain:        "PASTE_YOUR_AUTH_DOMAIN_HERE",
  projectId:         "PASTE_YOUR_PROJECT_ID_HERE",
  storageBucket:     "PASTE_YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "PASTE_YOUR_MESSAGING_SENDER_ID_HERE",
  appId:             "PASTE_YOUR_APP_ID_HERE",
};
// ─────────────────────────────────────────────────────────────────────────────

// Detect un-filled placeholder config and expose a clear flag.
export const FIREBASE_CONFIGURED = !Object.values(firebaseConfig).some(v =>
  typeof v === "string" && v.startsWith("PASTE_")
);

const app        = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// ── AUTH ─────────────────────────────────────────────────────────────────────

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser() {
  await signOut(auth);
}

// ── FRIEND CODE ───────────────────────────────────────────────────────────────
// Derive a short, deterministic 6-char code from the user's Firebase UID.
// Uppercase alphanumeric, easy to share verbally.

export function friendCodeFromUid(uid) {
  // Simple djb2-style hash over the uid string
  let h = 5381;
  for (let i = 0; i < uid.length; i++) {
    h = ((h << 5) + h) ^ uid.charCodeAt(i);
    h = h >>> 0; // keep unsigned 32-bit
  }
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I,O,0,1 — visually ambiguous
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[h % chars.length];
    h = Math.floor(h / chars.length);
    if (h === 0) h = 5381; // prevent zeroing out
  }
  return code;
}

// ── USER DOCUMENT ─────────────────────────────────────────────────────────────
// Firestore path: users/{uid}
// Shape: { uid, displayName, photoURL, friendCode, xpMap, totalLevel,
//          friends: [uid, ...], encouragements: { fromUid: { name, ts } } }

export function userRef(uid)  { return doc(db, "users", uid); }
// Secondary index: friendcodes/{code} → { uid }  (so we can look up by code)
export function codeRef(code) { return doc(db, "friendcodes", code); }

/** Create or update the user's own document on login. */
export async function upsertUser(user, xpMap = {}) {
  const code = friendCodeFromUid(user.uid);
  const totalLevel = Object.values(xpMap).reduce((sum, xp) => {
    const { level } = getLevelFromXpSimple(xp);
    return sum + level;
  }, 0);

  await setDoc(userRef(user.uid), {
    uid:         user.uid,
    displayName: user.displayName || "Adventurer",
    photoURL:    user.photoURL    || "",
    friendCode:  code,
    xpMap:       xpMap,
    totalLevel:  totalLevel,
    updatedAt:   serverTimestamp(),
  }, { merge: true });

  // Write the reverse-lookup index
  await setDoc(codeRef(code), { uid: user.uid });
}

/** Push local xpMap to Firestore. Call whenever xpMap changes. */
export async function syncXpMap(uid, xpMap) {
  const totalLevel = Object.values(xpMap).reduce((sum, xp) => {
    const { level } = getLevelFromXpSimple(xp);
    return sum + level;
  }, 0);
  await updateDoc(userRef(uid), { xpMap, totalLevel, updatedAt: serverTimestamp() });
}

/** Fetch a user document once by uid. */
export async function fetchUser(uid) {
  const snap = await getDoc(userRef(uid));
  return snap.exists() ? snap.data() : null;
}

/** Look up a uid from a friend code. Returns null if not found. */
export async function uidFromCode(code) {
  const snap = await getDoc(codeRef(code.toUpperCase().trim()));
  return snap.exists() ? snap.data().uid : null;
}

/** Add a friend (both directions). */
export async function addFriend(myUid, theirUid) {
  await updateDoc(userRef(myUid),   { friends: arrayUnion(theirUid) });
  await updateDoc(userRef(theirUid), { friends: arrayUnion(myUid)   });
}

/** Remove a friend (both directions). */
export async function removeFriend(myUid, theirUid) {
  await updateDoc(userRef(myUid),    { friends: arrayRemove(theirUid) });
  await updateDoc(userRef(theirUid), { friends: arrayRemove(myUid)   });
}

/** Send an encouragement to a friend. Stored under their document. */
export async function sendEncouragement(fromUser, toUid) {
  await updateDoc(userRef(toUid), {
    [`encouragements.${fromUser.uid}`]: {
      name:  fromUser.displayName || "A friend",
      photo: fromUser.photoURL    || "",
      ts:    Date.now(),
    },
  });
}

/** Clear encouragements for the current user (they've been seen). */
export async function clearEncouragements(uid) {
  await updateDoc(userRef(uid), { encouragements: {} });
}

/** Subscribe to a user document. Returns an unsubscribe function. */
export function subscribeUser(uid, callback) {
  return onSnapshot(userRef(uid), snap => {
    if (snap.exists()) callback(snap.data());
  });
}

/** Subscribe to all friends' documents at once. Returns unsubscribe. */
export function subscribeFriends(friendUids, callback) {
  if (!friendUids.length) { callback([]); return () => {}; }
  const unsubs = friendUids.map(uid =>
    onSnapshot(userRef(uid), snap => {
      if (snap.exists()) callback(uid, snap.data());
    })
  );
  return () => unsubs.forEach(u => u());
}

// Minimal XP→level math duplicated here so firebase.js has no circular import.
function getLevelFromXpSimple(totalXp) {
  if (totalXp <= 0) return { level: 0 };
  let level = 0, spent = 0;
  while (spent + Math.floor(100 * Math.pow(1.15, level)) <= totalXp) {
    spent += Math.floor(100 * Math.pow(1.15, level));
    level++;
  }
  return { level };
}
