import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
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
      try {
        const token = await u.getIdTokenResult(true);
        const claimRole = (token.claims as { role?: string }).role;
        let resolved: AppRole = claimRole === "admin" || claimRole === "staff" ? claimRole : "user";
        if (resolved === "user") {
          const roleDoc = await fsGet<{ role?: string }>(COL.userRoles, u.uid).catch(() => null);
          if (roleDoc?.role === "admin" || roleDoc?.role === "staff") resolved = roleDoc.role;
        }
        setRole(resolved);
        setProfile(await ensureProfile(u));
      } catch {
        setProfile({ id: u.uid, email: u.email, full_name: u.displayName });
      } finally {
        setLoading(false);
      }
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
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        await signInWithPopup(getFirebaseAuth(), provider);
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