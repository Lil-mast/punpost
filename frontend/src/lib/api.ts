import axios from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
export const BACKEND_ORIGIN =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  API_URL.replace(/\/api\/?$/, "") ||
  "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean };
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      typeof window !== "undefined"
    ) {
      original._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const res = await axios.post(`${API_URL}/auth/token/refresh/`, {
            refresh,
          });
          localStorage.setItem("access_token", res.data.access);
          if (res.data.refresh) {
            localStorage.setItem("refresh_token", res.data.refresh);
          }
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${res.data.access}`;
          return api(original);
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        }
      }
    }
    return Promise.reject(error);
  }
);

export function startOAuth(provider: "google" | "github") {
  const next = encodeURIComponent("/api/auth/oauth/complete/");
  window.location.href = `${BACKEND_ORIGIN}/accounts/${provider}/login/?process=login&next=${next}`;
}
