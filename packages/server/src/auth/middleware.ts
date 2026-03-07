import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyApiKey } from './keys.js';
import { hasPermission, type Permission } from './permissions.js';

declare module 'fastify' {
    interface FastifyRequest {
        apiKey?: {
            id: string;
            name: string;
            permissions: string[];
        };
    }
}

export function requireAuth(permission: Permission) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return reply.status(401).send({
                error: 'Unauthorized',
                message: 'Missing or invalid Authorization header. Expected: Bearer wdk_...',
            });
        }

        const token = authHeader.slice(7);
        const key = verifyApiKey(token);

        if (!key) {
            return reply.status(401).send({
                error: 'Unauthorized',
                message: 'Invalid API key',
            });
        }

        if (!hasPermission(key.permissions, permission)) {
            return reply.status(403).send({
                error: 'Forbidden',
                message: `This API key lacks the required permission: ${permission}`,
            });
        }

        request.apiKey = key;
    };
}

/**
 * Middleware for admin dashboard routes — validates session cookie.
 * The dashboard uses a simple password-based login that sets a signed cookie.
 */
export function requireAdmin() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const sessionToken = request.cookies?.wadock_session;

        if (!sessionToken) {
            return reply.status(401).send({
                error: 'Unauthorized',
                message: 'Dashboard login required',
            });
        }

        const unsigned = request.unsignCookie(sessionToken);
        if (!unsigned.valid || unsigned.value !== 'admin') {
            return reply.status(401).send({
                error: 'Unauthorized',
                message: 'Invalid session',
            });
        }
    };
}
