import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, upsertUser, subscribeUser } from "./firebase.js";

export function useAuth(xpMap) {
  const [authUser,       setAuthUser]       = useState(undefined); // undefined = still loading
  const [myData,         setMyData]         = useState(null);
  const [firebaseError,  setFirebaseError]  = useState(null);

  useEffect(() => {
    // If the config still has placeholder values, bail out immediately
    // rather than letting Firebase throw an obscure internal error.
    try {
      const unsub = onAuthStateChanged(
        auth,
        async user => {
          setAuthUser(user || null);
          if (user) {
            try { await upsertUser(user, xpMap); }
            catch (e) { console.warn("upsertUser failed:", e); }
          } else {
            setMyData(null);
          }
        },
        err => {
          console.error("onAuthStateChanged error:", err);
          setFirebaseError(err.message || "Firebase auth error");
          setAuthUser(null);
        }
      );
      return unsub;
    } catch (e) {
      console.error("Firebase init error:", e);
      setFirebaseError(e.message || "Firebase failed to initialize");
      setAuthUser(null);
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!authUser) return;
    try {
      const unsub = subscribeUser(authUser.uid, data => setMyData(data));
      return unsub;
    } catch (e) {
      console.warn("subscribeUser failed:", e);
    }
  }, [authUser?.uid]);

  return { authUser, myData, firebaseError };
}
