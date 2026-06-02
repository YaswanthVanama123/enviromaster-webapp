import { tokenStore } from "../auth/tokenStore";
import { API_BASE_URL, shouldAutoLogoutOnUnauthorized } from "./endpoints";

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

type UnauthorizedHandler = () => void;

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

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
          error: (data as { message?: string }).message || "Request failed",
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
          error: (data as { message?: string }).message || "Request failed",
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
