import { queryAll, queryOne, execute } from '../client.js';
import { ulid } from 'ulid';

export interface MessageLogRow {
    id: string;
    direction: 'inbound' | 'outbound';
    chat_id: string;
    message_id: string | null;
    type: string;
    summary: string | null;
    status: string | null;
    timestamp: number;
    metadata: string | null;
}

export interface DeliveryLogRow {
    id: string;
    webhook_id: string;
    event_type: string;
    status_code: number | null;
    success: number;
    attempt: number;
    error: string | null;
    timestamp: number;
}

export function insertMessageLog(log: Omit<MessageLogRow, 'id'>): string {
    const id = ulid();
    execute(
        `INSERT INTO message_logs (id, direction, chat_id, message_id, type, summary, status, timestamp, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            id,
            log.direction,
            log.chat_id,
            log.message_id,
            log.type,
            log.summary,
            log.status,
            log.timestamp,
            log.metadata,
        ],
    );
    return id;
}

export function listMessageLogs(
    limit: number = 50,
    offset: number = 0,
): MessageLogRow[] {
    return queryAll<MessageLogRow>(
        'SELECT * FROM message_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?',
        [limit, offset],
    );
}

export function countMessageLogs(): number {
    const row = queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM message_logs',
    );
    return row?.count ?? 0;
}

export function insertDeliveryLog(log: Omit<DeliveryLogRow, 'id'>): string {
    const id = ulid();
    execute(
        `INSERT INTO delivery_logs (id, webhook_id, event_type, status_code, success, attempt, error, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            id,
            log.webhook_id,
            log.event_type,
            log.status_code,
            log.success,
            log.attempt,
            log.error,
            log.timestamp,
        ],
    );
    return id;
}

export function listDeliveryLogsByWebhook(
    webhookId: string,
    limit: number = 20,
): DeliveryLogRow[] {
    return queryAll<DeliveryLogRow>(
        'SELECT * FROM delivery_logs WHERE webhook_id = ? ORDER BY timestamp DESC LIMIT ?',
        [webhookId, limit],
    );
}

export function listRecentDeliveryLogs(limit: number = 50): DeliveryLogRow[] {
    return queryAll<DeliveryLogRow>(
        'SELECT * FROM delivery_logs ORDER BY timestamp DESC LIMIT ?',
        [limit],
    );
}
