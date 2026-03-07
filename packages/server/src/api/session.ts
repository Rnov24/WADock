import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/middleware.js';

export async function sessionRoutes(app: FastifyInstance) {
    app.get(
        '/api/session/status',
        { preHandler: requireAuth('session:read') },
        async () => {
            const transport = app.wadock.transport;

            return {
                connection: transport.connectionState?.connection ?? 'close',
                qr: transport.qrCode,
                account: transport.selfJid
                    ? transport.selfJid.replace(/@.*$/, '')
                    : null,
            };
        },
    );

    app.post(
        '/api/session/logout',
        { preHandler: requireAuth('session:write') },
        async (request, reply) => {
            const transport = app.wadock.transport;

            if (transport.socket) {
                try {
                    await transport.socket.logout();
                } catch { /* ignore */ }
            }
            await transport.stop();

            // Force delete session files
            const { join } = await import('node:path');
            const { rmSync } = await import('node:fs');
            const sessionDir = join(app.wadock.config.dataDir, 'session');
            try {
                rmSync(sessionDir, { recursive: true, force: true });
            } catch { /* ignore */ }

            transport.connectionState = { connection: 'close' } as any;

            return { success: true, message: 'Logged out and session cleared' };
        },
    );

    app.post(
        '/api/session/restart',
        { preHandler: requireAuth('session:write') },
        async () => {
            const transport = app.wadock.transport;
            await transport.stop();
            await transport.start();
            return { success: true, message: 'Reconnecting...' };
        },
    );
}
