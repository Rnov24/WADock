import type { WADockTransport } from '../transport/connection.js';
import type { Config } from '../config.js';

declare module 'fastify' {
    interface FastifyInstance {
        wadock: {
            transport: WADockTransport;
            config: Config;
        };
    }
}
