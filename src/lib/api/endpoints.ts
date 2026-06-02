export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:5000";

export const ENDPOINTS = {
  auth: {
    adminLogin: "/api/admin/login",
    adminProfile: "/api/admin/me",
    adminChangePassword: "/api/admin/change-password",
    employeeLogin: "/api/employee/login",
    employeeProfile: "/api/employee/me",
    employeeChangePassword: "/api/employee/change-password",
  },
  pdf: {
    statusCounts: "/api/pdf/document-status-counts",
  },
  upload: {
    file: "/api/upload",
  },
  email: {
    send: "/api/email/send",
  },
} as const;

export const SKIP_AUTO_LOGOUT_PATHS: readonly string[] = [
  "/api/admin/login",
  "/api/employee/login",
];

export function shouldAutoLogoutOnUnauthorized(endpoint: string): boolean {
  return !SKIP_AUTO_LOGOUT_PATHS.some((p) => endpoint.startsWith(p));
}
