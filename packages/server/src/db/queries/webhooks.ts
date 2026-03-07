import { queryAll, queryOne, execute } from '../client.js';
import { ulid } from 'ulid';

export interface WebhookRow {
    id: string;
    url: string;
    events: string;
    secret: string | null;
    active: number;
    created_at: number;
    updated_at: number;
}

export function listWebhooks(): WebhookRow[] {
    return queryAll<WebhookRow>('SELECT * FROM webhooks ORDER BY created_at DESC');
}

export function listActiveWebhooks(): WebhookRow[] {
    return queryAll<WebhookRow>('SELECT * FROM webhooks WHERE active = 1');
}

export function getWebhook(id: string): WebhookRow | undefined {
    return queryOne<WebhookRow>('SELECT * FROM webhooks WHERE id = ?', [id]);
}

export function insertWebhook(
    url: string,
    events: string[],
    secret?: string,
): string {
    const id = ulid();
    const now = Date.now();
    execute(
        'INSERT INTO webhooks (id, url, events, secret, active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)',
        [id, url, JSON.stringify(events), secret ?? null, now, now],
    );
    return id;
}

export function updateWebhook(
    id: string,
    data: { url?: string; events?: string[]; secret?: string | null; active?: boolean },
): boolean {
    const webhook = getWebhook(id);
    if (!webhook) return false;

    const url = data.url ?? webhook.url;
    const events = data.events ? JSON.stringify(data.events) : webhook.events;
    const secret = data.secret !== undefined ? data.secret : webhook.secret;
    const active = data.active !== undefined ? (data.active ? 1 : 0) : webhook.active;

    const changes = execute(
        'UPDATE webhooks SET url = ?, events = ?, secret = ?, active = ?, updated_at = ? WHERE id = ?',
        [url, events, secret, active, Date.now(), id],
    );
    return changes > 0;
}

export function deleteWebhook(id: string): boolean {
    const changes = execute('DELETE FROM webhooks WHERE id = ?', [id]);
    return changes > 0;
}
