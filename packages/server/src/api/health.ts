import type { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
    app.get('/api/health', async () => {
        const transport = app.wadock.transport;

        return {
            status: 'ok',
            uptime: process.uptime(),
            connection: transport.connectionState?.connection ?? 'unknown',
            timestamp: Date.now(),
        };
    });
}
