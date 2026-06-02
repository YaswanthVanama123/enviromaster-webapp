const KEYS = {
  token: "em_auth_token",
  user: "em_auth_user",
  role: "em_auth_role",
} as const;

const LEGACY_KEYS = {
  token: ["auth_token", "admin_token"],
  user: ["auth_user", "admin_user"],
  role: ["user_role"],
} as const;

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readWithLegacy(primary: string, legacy: readonly string[]): string | null {
  const main = localStorage.getItem(primary);
  if (main !== null) return main;
  for (const key of legacy) {
    const v = localStorage.getItem(key);
    if (v !== null) return v;
  }
  return null;
}

export type Role = "admin" | "employee";

export interface StoredUser {
  id: string;
  username: string;
  fullName?: string;
  email?: string;
  isActive: boolean;
  lastLoginAt?: string;
  role: Role;
}

export const tokenStore = {
  getToken(): string | null {
    return readWithLegacy(KEYS.token, LEGACY_KEYS.token);
  },

  setToken(token: string): void {
    localStorage.setItem(KEYS.token, token);
  },

  getUser(): StoredUser | null {
    const raw = readWithLegacy(KEYS.user, LEGACY_KEYS.user);
    const parsed = safeParse<StoredUser>(raw);
    if (!parsed) return null;
    return parsed.role ? parsed : { ...parsed, role: "employee" };
  },

  setUser(user: StoredUser): void {
    localStorage.setItem(KEYS.user, JSON.stringify(user));
    localStorage.setItem(KEYS.role, user.role);
  },

  getRole(): Role | null {
    const raw = readWithLegacy(KEYS.role, LEGACY_KEYS.role);
    if (raw === "admin" || raw === "employee") return raw;
    const user = tokenStore.getUser();
    return user?.role ?? null;
  },

  clear(): void {
    [KEYS.token, KEYS.user, KEYS.role].forEach((k) => localStorage.removeItem(k));
    [...LEGACY_KEYS.token, ...LEGACY_KEYS.user, ...LEGACY_KEYS.role].forEach((k) =>
      localStorage.removeItem(k)
    );
  },

  isAuthenticated(): boolean {
    return !!tokenStore.getToken() && !!tokenStore.getUser();
  },
};
