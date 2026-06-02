import { tokenStore } from "../../lib/auth/tokenStore";
import type { AuthUser, UserRole } from "../types/api.types";

export const storage = {
  getToken(): string | null {
    return tokenStore.getToken();
  },
  setToken(token: string): void {
    tokenStore.setToken(token);
  },
  removeToken(): void {
    tokenStore.clear();
  },

  getUser(): AuthUser | null {
    return tokenStore.getUser() as AuthUser | null;
  },
  setUser(user: AuthUser): void {
    tokenStore.setUser(user);
  },
  removeUser(): void {
    tokenStore.clear();
  },

  getRole(): UserRole | null {
    return tokenStore.getRole();
  },
  setRole(role: UserRole): void {
    const user = tokenStore.getUser();
    if (user) tokenStore.setUser({ ...user, role });
  },
  removeRole(): void {
    tokenStore.clear();
  },

  getAdminUser(): AuthUser | null {
    return tokenStore.getUser() as AuthUser | null;
  },
  setAdminUser(user: AuthUser): void {
    tokenStore.setUser({ ...user, role: "admin" });
  },
  removeAdminUser(): void {
    tokenStore.clear();
  },

  clearAuth(): void {
    tokenStore.clear();
  },

  isAuthenticated(): boolean {
    return tokenStore.isAuthenticated();
  },
};
