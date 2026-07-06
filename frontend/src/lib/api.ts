const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';

interface ApiOptions extends RequestInit {
  token?: string;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(body.message ?? 'Request failed', res.status);
  }

  return body.data ?? body;
}

export const api = {
  auth: {
    register: (input: { name: string; email: string; password: string }) =>
      request<{ user: unknown; accessToken: string; refreshToken: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    login: (input: { email: string; password: string }) =>
      request<{ accessToken: string; refreshToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    forgotPassword: (email: string) =>
      request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    resetPassword: (token: string, password: string) =>
      request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
    verifyEmail: (token: string) =>
      request('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) }),
    me: (token: string) => request('/auth/me', { token }),
  },
  discovery: {
    discover: (input: { taskDescription: string; budget?: number; maxLatencyMs?: number }) =>
      request('/discovery', { method: 'POST', body: JSON.stringify(input) }),
  },
  orders: {
    create: (
      input: {
        taskDescription: string;
        budget?: number;
        maxLatencyMs?: number;
        requestedMode?: 'auto' | 'live' | 'simulated';
        targetServiceId?: string;
      },
      token: string,
    ) => request('/orders', { method: 'POST', body: JSON.stringify(input), token }),
    list: (token: string, status?: string) =>
      request(`/orders${status ? `?status=${status}` : ''}`, { token }),
    get: (id: string, token: string) => request(`/orders/${id}`, { token }),
    retry: (id: string, token: string) => request(`/orders/${id}/retry`, { method: 'POST', token }),
    cancel: (id: string, token: string) => request(`/orders/${id}/cancel`, { method: 'POST', token }),
  },
  cap: {
    status: () =>
      request<{
        configured: boolean;
        connected: boolean;
        protocolVersion: string;
        apiUrl: string;
        wsUrl: string;
        chainId: number;
        error?: string;
        checkedAt: string;
      }>('/cap/status'),
    myAgents: (token: string) =>
      request<
        {
          _id: string;
          name: string;
          slug: string;
          category: string;
          verification: string;
          availability: string;
          crooAgentId?: string;
          crooServiceId?: string;
          crooSyncStatus: 'unlinked' | 'linked' | 'error';
          crooLastSyncedAt?: string;
        }[]
      >('/cap/my-agents', { token }),
    registrationGuide: (slug: string, token: string) =>
      request('/cap/agents/' + slug + '/registration-guide', { token }),
    linkAgent: (slug: string, input: { crooAgentId: string; crooServiceId?: string }, token: string) =>
      request('/cap/agents/' + slug + '/link', { method: 'POST', body: JSON.stringify(input), token }),
    unlinkAgent: (slug: string, token: string) =>
      request('/cap/agents/' + slug + '/unlink', { method: 'POST', token }),
    orders: (token: string, role: 'provider' | 'buyer' = 'provider') =>
      request(`/cap/orders?role=${role}`, { token }),
    negotiations: (token: string, role: 'provider' | 'requester' = 'provider') =>
      request(`/cap/negotiations?role=${role}`, { token }),
  },
};

export { API_URL };
