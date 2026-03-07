import { z } from 'zod';

// --- Gateway Event Schemas ---

export const messagePayloadSchema = z.object({
    messageId: z.string(),
    from: z.string(),
    to: z.string(),
    chatId: z.string(),
    type: z.enum(['text', 'image', 'document', 'video', 'audio', 'sticker', 'unknown']),
    body: z.string().optional(),
    media: z
        .object({
            mimetype: z.string(),
            url: z.string().optional(),
            caption: z.string().optional(),
        })
        .optional(),
    timestamp: z.number(),
    fromMe: z.boolean(),
});

export const statusPayloadSchema = z.object({
    messageId: z.string(),
    chatId: z.string(),
    status: z.enum(['sent', 'delivered', 'read', 'played']),
    timestamp: z.number(),
});

export const connectionPayloadSchema = z.object({
    status: z.enum(['connecting', 'open', 'close']),
    qr: z.string().optional(),
    reason: z.string().optional(),
});

export const gatewayEventSchema = z.object({
    id: z.string(),
    timestamp: z.number(),
    type: z.enum([
        'message.incoming',
        'message.sent',
        'message.status',
        'connection.update',
    ]),
    payload: z.union([
        messagePayloadSchema,
        statusPayloadSchema,
        connectionPayloadSchema,
    ]),
});

export type MessagePayload = z.infer<typeof messagePayloadSchema>;
export type StatusPayload = z.infer<typeof statusPayloadSchema>;
export type ConnectionPayload = z.infer<typeof connectionPayloadSchema>;
export type GatewayEvent = z.infer<typeof gatewayEventSchema>;
export type GatewayEventType = GatewayEvent['type'];
