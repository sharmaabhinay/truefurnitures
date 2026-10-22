import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  updateProfile as fbUpdateProfile,
  type User,
} from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import { COL, fsGet, fsSet } from "@/lib/db/firestore";

export type AppRole = "admin" | "staff" | "user";

export type Profile = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  phone_verified?: boolean | null;
  city?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
  last_login_at?: string | null;
};

type AuthState = {
  user: User | null;
  profile: Profile | null;
  role: AppRole;
  isStaff: boolean;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<User>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function settleWithin<T>(promise: Promise<T>, milliseconds: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), milliseconds);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function ensureProfile(user: User): Promise<Profile> {
  const existing = await fsGet<Profile>(COL.profiles, user.uid);
  const patch: Profile = {
    id: user.uid,
    email: user.email,
    full_name: existing?.full_name ?? user.displayName ?? "",
    phone: existing?.phone ?? user.phoneNumber ?? null,
    phone_verified: existing?.phone_verified ?? false,
    avatar_url: existing?.avatar_url ?? user.photoURL ?? null,
    created_at: existing?.created_at ?? new Date().toISOString(),
    last_login_at: new Date().toISOString(),
  };
  await fsSet(COL.profiles, user.uid, patch);
  return { ...existing, ...patch };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole>("user");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), async (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setRole("user");
        setLoading(false);
        return;
      }
      // Show a basic profile immediately; enrich it in the background so account
      // pages never wait on slow profile reads.
      setProfile((prev) => (prev?.id === u.uid ? prev : { id: u.uid, email: u.email, full_name: u.displayName }));
      const profilePromise = settleWithin(ensureProfile(u), 8_000).then((p) => {
        if (p) setProfile(p);
      }).catch(() => undefined);
      try {
        // Cached token is fine here — it is refreshed automatically before expiry.
        const token = await u.getIdTokenResult();
        const claimRole = (token.claims as { role?: string }).role;
        let resolved: AppRole = claimRole === "admin" || claimRole === "staff" ? claimRole : "user";
        if (resolved === "user") {
          const roleDoc = await settleWithin(
            fsGet<{ role?: string }>(COL.userRoles, u.uid).catch(() => null),
            3_000,
          );
          if (roleDoc?.role === "admin" || roleDoc?.role === "staff") resolved = roleDoc.role;
        }
        setRole(resolved);
      } catch {
        setRole("user");
      } finally {
        setLoading(false);
      }
      void profilePromise;
    });
    return unsub;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    setProfile(await fsGet<Profile>(COL.profiles, user.uid));
  }, [user]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      profile,
      role,
      isStaff: role === "admin" || role === "staff",
      isAdmin: role === "admin",
      loading,
      signIn: async (email, password) => {
        await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      },
      signUp: async (email, password, fullName) => {
        const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
        if (fullName) await fbUpdateProfile(cred.user, { displayName: fullName });
        await ensureProfile(cred.user);
        return cred.user;
      },
      signInWithGoogle: async () => {
        const auth = getFirebaseAuth();
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        // The popup can finish after its promise settles on mobile; give the
        // session a moment to land before deciding sign-in failed.
        const waitForUser = async (ms: number) => {
          const end = Date.now() + ms;
          while (!auth.currentUser && Date.now() < end) await new Promise((r) => setTimeout(r, 200));
          return auth.currentUser;
        };
        try {
          const cred = await signInWithPopup(auth, provider);
          await auth.authStateReady();
          if (cred.user) await ensureProfile(cred.user).catch(() => undefined);
          return;
        } catch (err) {
          const code = (err as { code?: string })?.code ?? "";
          const message = String((err as Error)?.message ?? "");
          if (await waitForUser(2_500)) return;
          if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
            throw new Error("Google sign-in was closed before it finished. Please try again.");
          }
          // Only fall back to a full-page redirect when the popup could not open at all.
          if (
            code === "auth/popup-blocked" ||
            code === "auth/operation-not-supported-in-this-environment" ||
            /closing|hidden|indexeddb|InvalidStateError/i.test(message) ||
            code === "auth/internal-error"
          ) {
            await signInWithRedirect(auth, provider);
            return;
          }
          if (code === "auth/unauthorized-domain") {
            throw new Error("Google sign-in isn't enabled for this web address yet. Please use email sign-in for now.");
          }
          throw err;
        }
      },
      signOut: async () => {
        await fbSignOut(getFirebaseAuth());
      },
      resetPassword: async (email) => {
        await sendPasswordResetEmail(getFirebaseAuth(), email);
      },
      refreshProfile,
    }),
    [user, profile, role, loading, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}