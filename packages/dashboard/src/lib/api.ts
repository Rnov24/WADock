const BASE = '';

async function request(path: string, options: RequestInit = {}) {
    const res = await fetch(`${BASE}${path}`, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new ApiError(res.status, body.error ?? 'Request failed', body.message);
    }

    return res.json();
}

export class ApiError extends Error {
    constructor(
        public status: number,
        public error: string,
        public detail?: string,
    ) {
        super(detail ?? error);
    }
}

// --- Admin auth ---
export const admin = {
    login: (password: string) =>
        request('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) }),
    logout: () =>
        request('/api/admin/logout', { method: 'POST' }),
    me: () =>
        request('/api/admin/me'),
};

// --- Session ---
export const session = {
    status: () => request('/api/session/status'),
    logout: () => request('/api/session/logout', { method: 'POST' }),
    restart: () => request('/api/session/restart', { method: 'POST' }),
};

// --- API Keys ---
export const keys = {
    list: () => request('/api/keys'),
    create: (name: string, permissions: string[]) =>
        request('/api/keys', { method: 'POST', body: JSON.stringify({ name, permissions }) }),
    revoke: (id: string) =>
        request(`/api/keys/${id}`, { method: 'DELETE' }),
};

// --- Webhooks ---
export const webhooks = {
    list: () => request('/api/webhooks'),
    create: (url: string, events: string[], secret?: string) =>
        request('/api/webhooks', { method: 'POST', body: JSON.stringify({ url, events, secret }) }),
    update: (id: string, data: Record<string, unknown>) =>
        request(`/api/webhooks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) =>
        request(`/api/webhooks/${id}`, { method: 'DELETE' }),
};

// --- Logs ---
export const logs = {
    messages: (limit = 50, offset = 0) =>
        request(`/api/logs/messages?limit=${limit}&offset=${offset}`),
    deliveries: (limit = 50) =>
        request(`/api/logs/deliveries?limit=${limit}`),
};

// --- Health ---
export const health = {
    check: () => request('/api/health'),
};
