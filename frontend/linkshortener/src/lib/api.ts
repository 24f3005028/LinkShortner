// src/lib/api.ts
import axios from "axios";
import type {
  CreateLinkPayload,
  HealthResponse,
  LinkRead,
  LinkStats,
  PaginatedLinks,
  UnlockPayload,
  UnlockResponse,
} from "./types";

// Prefer env var, fall back to local dev URL.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Preconfigured Axios instance for this backend.
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
  },
});

// Shared error handler that mimics your fetch version.
function handleAxiosError(error: unknown): never {
  // If this is an AxiosError, inspect the response
  if (axios.isAxiosError(error)) {
    const res = error.response;
    let message = `Request failed with status ${res?.status ?? "unknown"}`;

    if (res?.data && typeof res.data === "object" && "detail" in res.data) {
      const detail = (res.data as { detail?: unknown }).detail;
      if (typeof detail === "string") {
        message = detail;
      }
    }

    throw new Error(message);
  }

  // Non-Axios error
  throw new Error("Request failed");
}

// Helper to build headers including optional Bearer token
function buildAuthHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

// GET /health
export async function healthCheck(): Promise<HealthResponse> {
  try {
    const response = await api.get<HealthResponse>("/health", {
      headers: buildAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

// POST /links
export async function createShortLink(
  payload: CreateLinkPayload,
  token?: string,
): Promise<LinkRead> {
  try {
    const expiresAt = payload.expiresAt ?? payload.expires_at;
    const body: Record<string, string | null> = {
      url: payload.url,
      custom_code: payload.customCode ?? null,
    };

    if (expiresAt !== undefined) {
      body.expires_at = expiresAt;
    }

    if (payload.password) {
      body.password = payload.password;
    }

    const response = await api.post<LinkRead>(
      "/links",
      body,
      {
        headers: {
          ...buildAuthHeaders(token),
          "Content-Type": "application/json",
        },
      },
    );
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

// GET /links?page=&page_size=
export async function listShortLinks(
  options?: { page?: number; pageSize?: number },
  token?: string,
): Promise<PaginatedLinks> {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 20;

  try {
    const response = await api.get<PaginatedLinks>("/links", {
      params: {
        page,
        page_size: pageSize,
      },
      headers: buildAuthHeaders(token),
    });
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

// GET /links/{code}/stats
export async function getLinkStats(
  code: string,
  token?: string,
): Promise<LinkStats> {
  try {
    const response = await api.get<LinkStats>(`/links/${encodeURIComponent(code)}/stats`, {
      headers: buildAuthHeaders(token),
    });
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

// POST /{code}/unlock
export async function unlockLink(
  code: string,
  payload: UnlockPayload,
): Promise<UnlockResponse> {
  try {
    const response = await api.post<UnlockResponse>(
      `/${encodeURIComponent(code)}/unlock`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}