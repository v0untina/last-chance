import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import toast from "react-hot-toast";

const BASE_URL = (import.meta.env.VITE_API_URL as string) || "/api";

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("algo.auth.token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface RetryCfg extends InternalAxiosRequestConfig {
  __retry?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError<{ error?: { code?: string; message?: string; statusCode?: number } }>) => {
    const cfg = err.config as RetryCfg | undefined;
    const status = err.response?.status;

    if (status === 429 && cfg) {
      cfg.__retry = (cfg.__retry ?? 0) + 1;
      if (cfg.__retry <= 3) {
        const delay = 500 * 2 ** (cfg.__retry - 1);
        await sleep(delay);
        return api.request(cfg);
      }
    }

    if (status && status >= 500 && cfg) {
      cfg.__retry = (cfg.__retry ?? 0) + 1;
      if (cfg.__retry <= 2) {
        await sleep(800 * cfg.__retry);
        return api.request(cfg);
      }
    }

    const msg =
      err.response?.data?.error?.message ??
      (status === undefined ? "Нет соединения с сервером" : `Ошибка ${status}`);
    if (status === 401) {
      localStorage.removeItem("algo.auth.token");
    } else if (status !== 429) {
      toast.error(msg);
    }
    return Promise.reject(err);
  }
);

export function extractErrorMessage(err: unknown, fallback = "Ошибка"): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message ?? err.message ?? fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
