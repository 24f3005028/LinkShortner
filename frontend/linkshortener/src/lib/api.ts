import type {
  CreateLinkPayload,
  HealthResponse,
  LinkRead,
  LinkStats,
  PaginatedLinks,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function handleJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const data = (await response.json()) as { detail?: unknown };
      if (typeof data.detail === "string") {
        message = data.detail;
      }
    } catch {
      // Keep the default message when the backend does not return JSON.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

function buildAuthHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export async function healthCheck(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`, {
    method: "GET",
    headers: buildAuthHeaders(),
  });

  return handleJsonResponse<HealthResponse>(response);
}

export async function createShortLink(
  payload: CreateLinkPayload,
  token?: string,
): Promise<LinkRead> {
  const response = await fetch(`${API_BASE_URL}/links`, {
    method: "POST",
    headers: {
      ...buildAuthHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: payload.url,
      custom_code: payload.customCode ?? null,
      expires_at: payload.expiresAt ?? null,
    }),
  });

  return handleJsonResponse<LinkRead>(response);
}

export async function listShortLinks(
  options?: { page?: number; pageSize?: number },
  token?: string,
): Promise<PaginatedLinks> {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 20;
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });

  const response = await fetch(`${API_BASE_URL}/links?${params.toString()}`, {
    method: "GET",
    headers: buildAuthHeaders(token),
  });

  return handleJsonResponse<PaginatedLinks>(response);
}

export async function getLinkStats(code: string, token?: string): Promise<LinkStats> {
  const response = await fetch(`${API_BASE_URL}/links/${encodeURIComponent(code)}/stats`, {
    method: "GET",
    headers: buildAuthHeaders(token),
  });

  return handleJsonResponse<LinkStats>(response);
}