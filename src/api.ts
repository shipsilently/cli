/** Typed API client for the ShipSilently v2 REST API. */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  apiUrl: string,
  token: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${apiUrl}/api/v2${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    let message = text;
    try {
      const body = JSON.parse(text) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // leave as raw text
    }
    throw new ApiError(res.status, `HTTP ${res.status}: ${message}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  return res.json() as Promise<T>;
}

// ─── Types ─────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  key: string;
  name: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Environment {
  id: string;
  key: string;
  name: string;
  color: string;
  isProduction: boolean;
  createdAt: string;
}

export interface Flag {
  id: string;
  key: string;
  name: string;
  type: 'boolean' | 'string' | 'number' | 'json';
  tags: string[];
  description: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Token {
  id: string;
  name: string;
  description: string | null;
  role: 'reader' | 'writer' | 'admin';
  isServiceToken: boolean;
  tokenPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
  token?: string;
}

// ─── API surface ────────────────────────────────────────────────────────────

export function createApiClient(apiUrl: string, token: string) {
  const r = <T>(path: string, options?: RequestInit) =>
    request<T>(apiUrl, token, path, options);

  return {
    projects: {
      list: () => r<{ items: Project[]; totalCount: number }>('/projects'),
      get: (projectKey: string) => r<Project>(`/projects/${projectKey}`),
    },

    environments: {
      list: (projectKey: string) =>
        r<{ items: Environment[]; totalCount: number }>(
          `/projects/${projectKey}/environments`,
        ),
    },

    flags: {
      list: (projectKey: string) =>
        r<{ items: Flag[]; totalCount: number }>(`/flags/${projectKey}`),
    },

    tokens: {
      list: () => r<{ items: Token[]; totalCount: number }>('/tokens'),
      create: (body: { name: string; role?: 'reader' | 'writer' | 'admin'; description?: string; isServiceToken?: boolean }) =>
        r<Token>('/tokens', { method: 'POST', body: JSON.stringify(body) }),
      revoke: (id: string) => r<void>(`/tokens/${id}`, { method: 'DELETE' }),
    },
  };
}
