import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/middleware.js';
import { insertMessageLog } from '../db/queries/logs.js';

const phoneToJid = (phone: string) => `${phone.replace(/\D/g, '')}@s.whatsapp.net`;

const sendTextSchema = z.object({
    to: z.string().min(1, 'Recipient phone number is required'),
    text: z.string().min(1, 'Message text is required'),
});

const sendImageSchema = z.object({
    to: z.string().min(1),
    imageUrl: z.string().url('Must be a valid URL'),
    caption: z.string().optional(),
});

const sendDocumentSchema = z.object({
    to: z.string().min(1),
    documentUrl: z.string().url('Must be a valid URL'),
    filename: z.string().min(1),
    mimetype: z.string().optional(),
});

export async function messageRoutes(app: FastifyInstance) {
    app.post(
        '/api/messages/send-text',
        { preHandler: requireAuth('messages:send') },
        async (request, reply) => {
            const parsed = sendTextSchema.safeParse(request.body);
            if (!parsed.success) {
                return reply.status(400).send({
                    error: 'Validation Error',
                    details: parsed.error.flatten().fieldErrors,
                });
            }

            const { to, text } = parsed.data;
            const jid = phoneToJid(to);

            try {
                const messageId = await app.wadock.transport.sendTextMessage(jid, text);

                insertMessageLog({
                    direction: 'outbound',
                    chat_id: to,
                    message_id: messageId ?? null,
                    type: 'text',
                    summary: text.slice(0, 200),
                    status: 'sent',
                    timestamp: Date.now(),
                    metadata: null,
                });

                return { success: true, messageId };
            } catch (err) {
                app.log.error(err, 'Failed to send text message');
                return reply.status(500).send({
                    error: 'Send Failed',
                    message: err instanceof Error ? err.message : 'Unknown error',
                });
            }
        },
    );

    app.post(
        '/api/messages/send-image',
        { preHandler: requireAuth('messages:send') },
        async (request, reply) => {
            const parsed = sendImageSchema.safeParse(request.body);
            if (!parsed.success) {
                return reply.status(400).send({
                    error: 'Validation Error',
                    details: parsed.error.flatten().fieldErrors,
                });
            }

            const { to, imageUrl, caption } = parsed.data;
            const jid = phoneToJid(to);

            try {
                const messageId = await app.wadock.transport.sendImageMessage(
                    jid,
                    imageUrl,
                    caption,
                );

                insertMessageLog({
                    direction: 'outbound',
                    chat_id: to,
                    message_id: messageId ?? null,
                    type: 'image',
                    summary: caption?.slice(0, 200) ?? '[image]',
                    status: 'sent',
                    timestamp: Date.now(),
                    metadata: JSON.stringify({ imageUrl }),
                });

                return { success: true, messageId };
            } catch (err) {
                app.log.error(err, 'Failed to send image');
                return reply.status(500).send({
                    error: 'Send Failed',
                    message: err instanceof Error ? err.message : 'Unknown error',
                });
            }
        },
    );

    app.post(
        '/api/messages/send-document',
        { preHandler: requireAuth('messages:send') },
        async (request, reply) => {
            const parsed = sendDocumentSchema.safeParse(request.body);
            if (!parsed.success) {
                return reply.status(400).send({
                    error: 'Validation Error',
                    details: parsed.error.flatten().fieldErrors,
                });
            }

            const { to, documentUrl, filename, mimetype } = parsed.data;
            const jid = phoneToJid(to);

            try {
                const messageId = await app.wadock.transport.sendDocumentMessage(
                    jid,
                    documentUrl,
                    filename,
                    mimetype,
                );

                insertMessageLog({
                    direction: 'outbound',
                    chat_id: to,
                    message_id: messageId ?? null,
                    type: 'document',
                    summary: `[document] ${filename}`,
                    status: 'sent',
                    timestamp: Date.now(),
                    metadata: JSON.stringify({ documentUrl, filename }),
                });

                return { success: true, messageId };
            } catch (err) {
                app.log.error(err, 'Failed to send document');
                return reply.status(500).send({
                    error: 'Send Failed',
                    message: err instanceof Error ? err.message : 'Unknown error',
                });
            }
        },
    );
}
