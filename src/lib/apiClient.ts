import { sessionStore } from "./session";

const BASE_URL = (import.meta.env["VITE_API_BASE_URL"] as string) || "http://localhost:8000/api";

export class APIError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code = "UNKNOWN_ERROR") {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem("securevote.token") || (sessionStore.get().user ? "demo-token" : null);
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Inject Idempotency key for vote submission if not explicitly provided
  if (endpoint.includes("/votes") && options.method === "POST" && !headers["X-Idempotency-Key"]) {
    headers["X-Idempotency-Key"] = `IDEMP-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
  }

  const url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorMessage = `HTTP Error ${res.status}: ${res.statusText}`;
      let errorCode = "UNKNOWN_ERROR";

      try {
        const errorData = await res.json();
        if (errorData.error) {
          errorMessage = errorData.error.message || errorMessage;
          errorCode = errorData.error.code || errorCode;
        } else if (errorData.detail) {
          errorMessage = typeof errorData.detail === "string" ? errorData.detail : JSON.stringify(errorData.detail);
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        /* Response body was not JSON */
      }

      if (res.status === 401 && !endpoint.includes("/auth/login")) {
        // Graceful session expiration handling
        localStorage.removeItem("securevote.token");
        sessionStore.clear();
      }

      throw new APIError(errorMessage, res.status, errorCode);
    }

    const data = await res.json();
    return data as T;
  } catch (err) {
    if (err instanceof APIError) throw err;
    throw new APIError((err as Error).message || "Unable to connect to the voting service.", 0, "NETWORK_ERROR");
  }
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) => {
    const fetchOpts: RequestInit = { ...options, method: "POST" };
    if (body !== undefined) {
      fetchOpts.body = JSON.stringify(body);
    }
    return request<T>(endpoint, fetchOpts);
  },

  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) => {
    const fetchOpts: RequestInit = { ...options, method: "PUT" };
    if (body !== undefined) {
      fetchOpts.body = JSON.stringify(body);
    }
    return request<T>(endpoint, fetchOpts);
  },

  patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) => {
    const fetchOpts: RequestInit = { ...options, method: "PATCH" };
    if (body !== undefined) {
      fetchOpts.body = JSON.stringify(body);
    }
    return request<T>(endpoint, fetchOpts);
  },

  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
};


