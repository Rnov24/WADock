import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/middleware.js';
import {
    listMessageLogs,
    countMessageLogs,
    listRecentDeliveryLogs,
} from '../db/queries/logs.js';

const paginationSchema = z.object({
    limit: z.coerce.number().min(1).max(100).default(50),
    offset: z.coerce.number().min(0).default(0),
});

export async function logRoutes(app: FastifyInstance) {
    app.get(
        '/api/logs/messages',
        { preHandler: requireAuth('logs:read') },
        async (request) => {
            const query = paginationSchema.parse(request.query);
            const logs = listMessageLogs(query.limit, query.offset);
            const total = countMessageLogs();

            return {
                data: logs.map((log) => ({
                    id: log.id,
                    direction: log.direction,
                    chatId: log.chat_id,
                    messageId: log.message_id,
                    type: log.type,
                    summary: log.summary,
                    status: log.status,
                    timestamp: log.timestamp,
                    metadata: log.metadata ? JSON.parse(log.metadata) : null,
                })),
                pagination: {
                    total,
                    limit: query.limit,
                    offset: query.offset,
                },
            };
        },
    );

    app.get(
        '/api/logs/deliveries',
        { preHandler: requireAuth('logs:read') },
        async (request) => {
            const query = paginationSchema.parse(request.query);
            const logs = listRecentDeliveryLogs(query.limit);

            return {
                data: logs.map((log) => ({
                    id: log.id,
                    webhookId: log.webhook_id,
                    eventType: log.event_type,
                    statusCode: log.status_code,
                    success: log.success === 1,
                    attempt: log.attempt,
                    error: log.error,
                    timestamp: log.timestamp,
                })),
            };
        },
    );
}
