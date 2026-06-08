import { tokenStore } from "../auth/tokenStore";
import { API_BASE_URL, shouldAutoLogoutOnUnauthorized } from "./endpoints";

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

type UnauthorizedHandler = () => void;

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

// Surface the most meaningful server error message. The backend returns errors
// as { error, detail } (e.g. { error: "Unauthorized", detail: "Invalid credentials" }),
// sometimes { message }, and occasionally { errors: [{ message }] }. Fall back to a
// status-based message instead of a generic "Request failed".
function extractErrorMessage(data: unknown, status: number): string {
  const d = (data ?? {}) as Record<string, unknown>;
  const detail = typeof d.detail === "string" ? d.detail : undefined;
  const message = typeof d.message === "string" ? d.message : undefined;
  const err = typeof d.error === "string" ? d.error : undefined;
  const nested =
    Array.isArray(d.errors) && d.errors.length > 0 && typeof (d.errors[0] as any)?.message === "string"
      ? ((d.errors[0] as any).message as string)
      : undefined;

  const resolved = detail || message || nested || err;
  if (resolved) {
    return resolved;
  }

  // Generic, human-readable fallbacks by status code.
  if (status === 401 || status === 403) return "Invalid credentials";
  if (status === 404) return "Not found";
  if (status === 400) return "Invalid request";
  if (status >= 500) return "Server error. Please try again.";
  return "Request failed";
}

interface RequestOptions {
  body?: unknown;
  headers?: HeadersInit;
}

class ApiClient {
  private baseUrl: string;
  private onUnauthorized: UnauthorizedHandler | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
    this.onUnauthorized = handler;
  }

  setUnauthorizedCallback(handler: UnauthorizedHandler | null): void {
    this.onUnauthorized = handler;
  }

  getToken(): string | null {
    return tokenStore.getToken();
  }

  setToken(token: string | null): void {
    if (token === null) {
      tokenStore.clear();
    } else {
      tokenStore.setToken(token);
    }
  }

  private buildHeaders(extra: HeadersInit | undefined, isJson: boolean): HeadersInit {
    const base: Record<string, string> = {};
    if (isJson) base["Content-Type"] = "application/json";
    const token = tokenStore.getToken();
    if (token) base["Authorization"] = `Bearer ${token}`;
    return { ...base, ...(extra as Record<string, string> | undefined) };
  }

  private async request<T>(
    method: Method,
    endpoint: string,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const isJson = options?.body !== undefined;
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: this.buildHeaders(options?.headers, isJson),
        body: isJson ? JSON.stringify(options!.body) : undefined,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (
          (response.status === 401 || response.status === 403) &&
          shouldAutoLogoutOnUnauthorized(endpoint) &&
          this.onUnauthorized
        ) {
          this.onUnauthorized();
        }
        return {
          error: extractErrorMessage(data, response.status),
          status: response.status,
        };
      }

      return { data: data as T, status: response.status };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Network error",
        status: 0,
      };
    }
  }

  get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>("GET", endpoint);
  }

  post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>("POST", endpoint, { body });
  }

  put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>("PUT", endpoint, { body });
  }

  patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>("PATCH", endpoint, { body });
  }

  delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>("DELETE", endpoint, options);
  }

  async postFormData<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    const token = tokenStore.getToken();
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers,
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (
          (response.status === 401 || response.status === 403) &&
          shouldAutoLogoutOnUnauthorized(endpoint) &&
          this.onUnauthorized
        ) {
          this.onUnauthorized();
        }
        return {
          error: extractErrorMessage(data, response.status),
          status: response.status,
        };
      }
      return { data: data as T, status: response.status };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Network error",
        status: 0,
      };
    }
  }

  async downloadBlob(endpoint: string): Promise<Blob> {
    const token = tokenStore.getToken();
    const headers: HeadersInit = {
      Accept: "application/pdf, application/octet-stream",
    };
    if (token) (headers as Record<string, string>).Authorization = `Bearer ${token}`;
    const response = await fetch(`${this.baseUrl}${endpoint}`, { method: "GET", headers });
    if (!response.ok) {
      if (
        (response.status === 401 || response.status === 403) &&
        shouldAutoLogoutOnUnauthorized(endpoint) &&
        this.onUnauthorized
      ) {
        this.onUnauthorized();
      }
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }
    return response.blob();
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
