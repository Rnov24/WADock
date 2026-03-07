import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAdmin } from '../auth/middleware.js';

const loginSchema = z.object({
    password: z.string().min(1),
});

export async function adminRoutes(app: FastifyInstance) {
    /** Login — sets a signed session cookie */
    app.post('/api/admin/login', async (request, reply) => {
        const parsed = loginSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: 'Password is required' });
        }

        if (parsed.data.password !== app.wadock.config.adminPassword) {
            return reply.status(401).send({ error: 'Invalid password' });
        }

        reply.setCookie('wadock_session', 'admin', {
            path: '/',
            signed: true,
            httpOnly: true,
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7, // 7 days
        });

        return { success: true };
    });

    /** Logout — clears the session cookie */
    app.post('/api/admin/logout', async (request, reply) => {
        reply.clearCookie('wadock_session', { path: '/' });
        return { success: true };
    });

    /** Check if the current session is valid */
    app.get(
        '/api/admin/me',
        { preHandler: requireAdmin() },
        async () => {
            return { authenticated: true };
        },
    );
}
