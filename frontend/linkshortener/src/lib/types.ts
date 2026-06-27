export interface HealthResponse {
  status: string;
}

export interface CreateLinkPayload {
  url: string;
  customCode?: string | null;
  expiresAt?: string | null;
  expires_at?: string | null;
}

export interface LinkRead {
  is_locked: boolean;
  code: string;
  original_url: string;
  short_url: string;
  click_count: number;
  created_at: string;
  expires_at: string | null;
}

export interface LinkStats {
  code: string;
  original_url: string;
  click_count: number;
  created_at: string;
  expires_at: string | null;
}

export interface PaginatedLinks {
  items: LinkRead[];
  total: number;
  page: number;
  page_size: number;
}