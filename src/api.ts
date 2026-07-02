/// <reference types="vite/client" />

const envBase = import.meta.env.VITE_API_BASE;

export const API_BASE = envBase || "";

export function apiUrl(path: string) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}
