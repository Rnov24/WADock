import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

import { loadConfig } from './config.js';
import { initDb, closeDb } from './db/client.js';
import { createTransport } from './transport/connection.js';
import { normalizeMessage, normalizeStatusUpdate } from './events/normalizer.js';
import { createDispatcher } from './delivery/dispatcher.js';
import { insertMessageLog } from './db/queries/logs.js';

// API routes
import { healthRoutes } from './api/health.js';
import { sessionRoutes } from './api/session.js';
import { messageRoutes } from './api/messages.js';
import { webhookRoutes } from './api/webhooks.js';
import { keyRoutes } from './api/keys.js';
import { logRoutes } from './api/logs.js';
import { adminRoutes } from './api/admin.js';

// Type augmentation
import './plugins/types.js';

async function main() {
    // --- Load config ---
    const config = loadConfig();

    // --- Init database ---
    await initDb(config.dataDir);

    // --- Create Fastify app ---
    const app = Fastify({
        logger: {
            level: config.logLevel,
            transport: {
                target: 'pino-pretty',
                options: { colorize: true },
            },
        },
    });

    // --- Plugins ---
    await app.register(fastifyCors, {
        origin: true,
        credentials: true,
    });

    await app.register(fastifyCookie, {
        secret: config.adminPassword, // Used to sign cookies
    });

    // --- Transport layer ---
    const transport = createTransport(config.dataDir, config.logLevel);
    const dispatcher = createDispatcher(config);

    // Decorate Fastify with wadock context
    app.decorate('wadock', {
        transport,
        config,
    });

    // --- Event wiring ---
    transport.on('message', (msg) => {
        const event = normalizeMessage(msg, transport.selfJid ?? '');

        // Log inbound messages
        const payload = event.payload as {
            chatId: string;
            messageId: string;
            type: string;
            body?: string;
        };
        if (event.type === 'message.incoming') {
            insertMessageLog({
                direction: 'inbound',
                chat_id: payload.chatId,
                message_id: payload.messageId,
                type: payload.type,
                summary: payload.body?.slice(0, 200) ?? `[${payload.type}]`,
                status: 'received',
                timestamp: Date.now(),
                metadata: null,
            });
        }

        dispatcher.dispatch(event);
    });

    transport.on('message.status', ({ key, status }) => {
        const event = normalizeStatusUpdate(key, status);
        dispatcher.dispatch(event);
    });

    transport.on('connection', (data) => {
        app.log.info(`Connection: ${data.status}${data.reason ? ` (${data.reason})` : ''}`);
        dispatcher.dispatch({
            id: '',
            timestamp: Date.now(),
            type: 'connection.update',
            payload: data,
        });
    });

    transport.on('qr', (qr) => {
        app.log.info('QR code generated — scan with WhatsApp');
    });

    // --- Register API routes ---
    await app.register(healthRoutes);
    await app.register(sessionRoutes);
    await app.register(messageRoutes);
    await app.register(webhookRoutes);
    await app.register(keyRoutes);
    await app.register(logRoutes);
    await app.register(adminRoutes);

    // --- Serve dashboard static files ---
    const dashboardDir = join(
        new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
        'dashboard',
    );

    if (existsSync(dashboardDir)) {
        await app.register(fastifyStatic, {
            root: dashboardDir,
            prefix: '/',
            wildcard: false,
        });

        // SPA fallback: serve index.html for non-API routes
        app.setNotFoundHandler((request, reply) => {
            if (request.url.startsWith('/api/')) {
                return reply.status(404).send({ error: 'Not Found' });
            }
            return reply.sendFile('index.html');
        });
    } else {
        app.log.warn(`Dashboard not found at ${dashboardDir} — serving API only`);

        app.setNotFoundHandler((request, reply) => {
            return reply.status(404).send({ error: 'Not Found' });
        });
    }

    // --- Start transport ---
    await transport.start();

    // --- Start server ---
    await app.listen({ port: config.port, host: '0.0.0.0' });
    app.log.info(`WADock running on http://0.0.0.0:${config.port}`);

    // --- Graceful shutdown ---
    const shutdown = async () => {
        app.log.info('Shutting down...');
        await transport.stop();
        await app.close();
        closeDb();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

main().catch((err) => {
    console.error('Failed to start WADock:', err);
    process.exit(1);
});
