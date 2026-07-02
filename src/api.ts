/// <reference types="vite/client" />

const envBase = import.meta.env.VITE_API_BASE;
const defaultBase = typeof window !== "undefined"
  ? window.location.origin
  : "http://localhost:3000";

export const API_BASE = envBase || defaultBase;

export function apiUrl(path: string) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}
