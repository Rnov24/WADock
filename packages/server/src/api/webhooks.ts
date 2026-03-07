import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/middleware.js';
import {
    listWebhooks,
    getWebhook,
    insertWebhook,
    updateWebhook,
    deleteWebhook,
} from '../db/queries/webhooks.js';
import type { GatewayEventType } from '../events/schemas.js';

const VALID_EVENTS: GatewayEventType[] = [
    'message.incoming',
    'message.sent',
    'message.status',
    'connection.update',
];

const createWebhookSchema = z.object({
    url: z.string().url('Must be a valid URL'),
    events: z.array(z.string()).min(1, 'At least one event type is required'),
    secret: z.string().optional(),
});

const updateWebhookSchema = z.object({
    url: z.string().url().optional(),
    events: z.array(z.string()).optional(),
    secret: z.string().nullable().optional(),
    active: z.boolean().optional(),
});

export async function webhookRoutes(app: FastifyInstance) {
    app.get(
        '/api/webhooks',
        { preHandler: requireAuth('webhooks:read') },
        async () => {
            const rows = listWebhooks();
            return rows.map((wh) => ({
                id: wh.id,
                url: wh.url,
                events: JSON.parse(wh.events),
                secret: wh.secret ? '••••••••' : null,
                active: wh.active === 1,
                createdAt: wh.created_at,
                updatedAt: wh.updated_at,
            }));
        },
    );

    app.post(
        '/api/webhooks',
        { preHandler: requireAuth('webhooks:write') },
        async (request, reply) => {
            const parsed = createWebhookSchema.safeParse(request.body);
            if (!parsed.success) {
                return reply.status(400).send({
                    error: 'Validation Error',
                    details: parsed.error.flatten().fieldErrors,
                });
            }

            const { url, events, secret } = parsed.data;

            // Validate event types
            for (const evt of events) {
                if (evt !== '*' && !VALID_EVENTS.includes(evt as GatewayEventType)) {
                    return reply.status(400).send({
                        error: 'Validation Error',
                        message: `Invalid event type: ${evt}. Valid types: *, ${VALID_EVENTS.join(', ')}`,
                    });
                }
            }

            const id = insertWebhook(url, events, secret);
            return reply.status(201).send({ id, url, events, active: true });
        },
    );

    app.patch(
        '/api/webhooks/:id',
        { preHandler: requireAuth('webhooks:write') },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const parsed = updateWebhookSchema.safeParse(request.body);
            if (!parsed.success) {
                return reply.status(400).send({
                    error: 'Validation Error',
                    details: parsed.error.flatten().fieldErrors,
                });
            }

            const existing = getWebhook(id);
            if (!existing) {
                return reply.status(404).send({ error: 'Not Found', message: 'Webhook not found' });
            }

            const updated = updateWebhook(id, parsed.data);
            if (!updated) {
                return reply.status(500).send({ error: 'Update failed' });
            }

            return { success: true };
        },
    );

    app.delete(
        '/api/webhooks/:id',
        { preHandler: requireAuth('webhooks:write') },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const deleted = deleteWebhook(id);
            if (!deleted) {
                return reply.status(404).send({ error: 'Not Found', message: 'Webhook not found' });
            }
            return { success: true };
        },
    );
}
