"use client";

import type { AuthResponse, AuthUser } from "./types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

const ACCESS_KEY = "excursi_access";
const REFRESH_KEY = "excursi_refresh";
const USER_KEY = "excursi_user";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** localStorage-backed token store (browser only). */
export const tokenStore = {
  get access(): string | null {
    return typeof window === "undefined" ? null : localStorage.getItem(ACCESS_KEY);
  },
  get refresh(): string | null {
    return typeof window === "undefined" ? null : localStorage.getItem(REFRESH_KEY);
  },
  get user(): AuthUser | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  },
  setSession(session: AuthResponse) {
    localStorage.setItem(ACCESS_KEY, session.accessToken);
    localStorage.setItem(REFRESH_KEY, session.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  },
  setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

interface FetchOpts {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

function raw(path: string, opts: FetchOpts, token?: string | null) {
  return fetch(`${API_URL}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
}

/**
 * Fetch against the API. When `auth` is set, attaches the access token and, on
 * a 401, transparently refreshes once and retries. Throws ApiError on failure.
 */
export async function apiJson<T = any>(
  path: string,
  opts: FetchOpts = {},
): Promise<T> {
  let res = await raw(path, opts, opts.auth ? tokenStore.access : undefined);

  if (res.status === 401 && opts.auth && tokenStore.refresh) {
    const refreshed = await raw("/auth/refresh", {
      method: "POST",
      body: { refreshToken: tokenStore.refresh },
    });
    if (refreshed.ok) {
      const data = (await refreshed.json()) as {
        accessToken: string;
        refreshToken: string;
      };
      tokenStore.setTokens(data.accessToken, data.refreshToken);
      res = await raw(path, opts, data.accessToken);
    } else {
      tokenStore.clear();
    }
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}
