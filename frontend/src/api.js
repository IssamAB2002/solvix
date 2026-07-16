// ─── API CLIENT ──────────────────────────────────────────────────────────────
// Small fetch wrapper. Staff token is stored in localStorage (solvix_token).

import { API_BASE } from "./config";

export function getToken() {
  return localStorage.getItem("solvix_token");
}

export async function api(path, { method = "GET", body, auth = true } = {}) {
  const token = auth ? getToken() : null;
  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}
