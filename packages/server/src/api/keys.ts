import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/middleware.js';
import { createApiKey, revokeApiKey, getAllKeys } from '../auth/keys.js';
import { PERMISSIONS, validatePermissions } from '../auth/permissions.js';

const createKeySchema = z.object({
    name: z.string().min(1, 'Key name is required').max(100),
    permissions: z.array(z.string()).min(1, 'At least one permission is required'),
});

export async function keyRoutes(app: FastifyInstance) {
    app.get(
        '/api/keys',
        { preHandler: requireAuth('keys:read') },
        async () => {
            return getAllKeys();
        },
    );

    app.post(
        '/api/keys',
        { preHandler: requireAuth('keys:write') },
        async (request, reply) => {
            const parsed = createKeySchema.safeParse(request.body);
            if (!parsed.success) {
                return reply.status(400).send({
                    error: 'Validation Error',
                    details: parsed.error.flatten().fieldErrors,
                });
            }

            const { name, permissions } = parsed.data;

            if (!validatePermissions(permissions)) {
                return reply.status(400).send({
                    error: 'Validation Error',
                    message: `Invalid permissions. Valid values: full, ${PERMISSIONS.join(', ')}`,
                });
            }

            const { id, rawKey } = createApiKey(name, permissions);

            return reply.status(201).send({
                id,
                name,
                permissions,
                key: rawKey,
                warning: 'Save this key now. It will not be shown again.',
            });
        },
    );

    app.delete(
        '/api/keys/:id',
        { preHandler: requireAuth('keys:write') },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const deleted = revokeApiKey(id);
            if (!deleted) {
                return reply.status(404).send({ error: 'Not Found', message: 'API key not found' });
            }
            return { success: true };
        },
    );
}
