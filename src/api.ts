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

export interface Page<T> {
  items: T[];
  totalCount: number | null;
  nextCursor: string | null;
}

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
  temporary: boolean;
  expectedLifespanDays: number | null;
  deprecatedAt: string | null;
  removeByAt: string | null;
  deprecationNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FlagDetailEnvironment {
  envId: string;
  envKey: string;
  enabled: boolean;
  defaultValue: unknown;
}

export interface FlagDetailRule {
  id: string;
  envId: string;
  envKey: string;
  name: string | null;
  sortOrder: number;
  conditions: unknown[];
  serveValue: unknown;
  rolloutPercentage: number | null;
}

export interface FlagDetail extends Flag {
  environments: FlagDetailEnvironment[];
  rules: FlagDetailRule[];
}

export interface FlagEnvState {
  flagId: string;
  flagKey: string;
  envId: string;
  envKey: string;
  enabled: boolean;
  defaultValue: unknown;
  hasRules: boolean;
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

  /** Walk a cursor-paginated collection to completion. */
  const all = async <T>(basePath: string): Promise<{ items: T[]; totalCount: number }> => {
    const items: T[] = [];
    let totalCount = 0;
    let cursor: string | null = null;
    do {
      const sep = basePath.includes('?') ? '&' : '?';
      const page: Page<T> = await r<Page<T>>(
        `${basePath}${sep}limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
      );
      items.push(...page.items);
      totalCount = page.totalCount ?? items.length;
      cursor = page.nextCursor;
    } while (cursor);
    return { items, totalCount };
  };

  return {
    projects: {
      list: () => all<Project>('/projects'),
      get: (projectKey: string) => r<Project>(`/projects/${projectKey}`),
    },

    environments: {
      list: (projectKey: string) => all<Environment>(`/projects/${projectKey}/environments`),
      update: (projectKey: string, envKey: string, body: { name?: string }) =>
        r<Environment>(`/projects/${projectKey}/environments/${envKey}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),
    },

    flags: {
      list: (projectKey: string, status: 'active' | 'archived' | 'all' = 'all') =>
        all<Flag>(`/projects/${projectKey}/flags?status=${status}`),
      get: (projectKey: string, flagKey: string) =>
        r<FlagDetail>(`/projects/${projectKey}/flags/${flagKey}`),
      states: (projectKey: string, envKey?: string) =>
        all<FlagEnvState>(
          `/projects/${projectKey}/flag-states${envKey ? `?envKey=${encodeURIComponent(envKey)}` : ''}`,
        ),
      deprecate: (
        projectKey: string,
        flagKey: string,
        body: { note?: string; removeByAt?: string },
      ) =>
        r<Flag>(`/projects/${projectKey}/flags/${flagKey}/deprecate`, {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      undeprecate: (projectKey: string, flagKey: string) =>
        r<Flag>(`/projects/${projectKey}/flags/${flagKey}/undeprecate`, { method: 'POST' }),
      restore: (projectKey: string, flagKey: string) =>
        r<Flag>(`/projects/${projectKey}/flags/${flagKey}/restore`, { method: 'POST' }),
      purge: (projectKey: string, flagKey: string) =>
        r<void>(`/projects/${projectKey}/flags/${flagKey}/permanent`, { method: 'DELETE' }),
    },

    tokens: {
      list: () => all<Token>('/tokens'),
      create: (body: { name: string; role?: 'reader' | 'writer' | 'admin'; description?: string; isServiceToken?: boolean }) =>
        r<Token>('/tokens', { method: 'POST', body: JSON.stringify(body) }),
      revoke: (id: string) => r<void>(`/tokens/${id}`, { method: 'DELETE' }),
      reset: (id: string) => r<Token>(`/tokens/${id}/reset`, { method: 'POST' }),
    },
  };
}
