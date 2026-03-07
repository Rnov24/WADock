import type { WAMessage, WAMessageKey } from '@whiskeysockets/baileys';
import { ulid } from 'ulid';
import type { GatewayEvent, MessagePayload } from './schemas.js';

/**
 * Extract a readable phone number from a WhatsApp JID.
 * e.g. "6281234567890@s.whatsapp.net" → "6281234567890"
 */
function jidToPhone(jid: string | null | undefined): string {
    if (!jid) return '';
    return jid.replace(/@.*$/, '');
}

/**
 * Determine message content type from a WAMessage.
 */
function getMessageType(msg: WAMessage): MessagePayload['type'] {
    const m = msg.message;
    if (!m) return 'unknown';
    if (m.conversation || m.extendedTextMessage) return 'text';
    if (m.imageMessage) return 'image';
    if (m.documentMessage || m.documentWithCaptionMessage) return 'document';
    if (m.videoMessage) return 'video';
    if (m.audioMessage) return 'audio';
    if (m.stickerMessage) return 'sticker';
    return 'unknown';
}

/**
 * Extract text body from a WAMessage.
 */
function getTextBody(msg: WAMessage): string | undefined {
    const m = msg.message;
    if (!m) return undefined;
    if (m.conversation) return m.conversation;
    if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
    if (m.imageMessage?.caption) return m.imageMessage.caption;
    if (m.videoMessage?.caption) return m.videoMessage.caption;
    if (m.documentWithCaptionMessage?.message?.documentMessage?.caption) {
        return m.documentWithCaptionMessage.message.documentMessage.caption;
    }
    return undefined;
}

/**
 * Extract media metadata from a WAMessage if applicable.
 */
function getMediaInfo(msg: WAMessage) {
    const m = msg.message;
    if (!m) return undefined;

    const mediaMsg =
        m.imageMessage ??
        m.documentMessage ??
        m.videoMessage ??
        m.audioMessage ??
        m.stickerMessage ??
        m.documentWithCaptionMessage?.message?.documentMessage;

    if (!mediaMsg) return undefined;

    return {
        mimetype: (mediaMsg as { mimetype?: string }).mimetype ?? 'application/octet-stream',
        caption: (mediaMsg as { caption?: string }).caption,
    };
}

/**
 * Normalize a raw Baileys WAMessage into a GatewayEvent.
 */
export function normalizeMessage(msg: WAMessage, selfJid: string): GatewayEvent {
    const fromMe = msg.key.fromMe ?? false;
    const type = getMessageType(msg);

    const payload: MessagePayload = {
        messageId: msg.key.id ?? ulid(),
        from: fromMe ? jidToPhone(selfJid) : jidToPhone(msg.key.remoteJid),
        to: fromMe ? jidToPhone(msg.key.remoteJid) : jidToPhone(selfJid),
        chatId: jidToPhone(msg.key.remoteJid),
        type,
        body: getTextBody(msg),
        media: getMediaInfo(msg),
        timestamp: (msg.messageTimestamp as number) * 1000 || Date.now(),
        fromMe,
    };

    return {
        id: ulid(),
        timestamp: Date.now(),
        type: fromMe ? 'message.sent' : 'message.incoming',
        payload,
    };
}

/**
 * Normalize a message status update into a GatewayEvent.
 */
export function normalizeStatusUpdate(
    key: WAMessageKey,
    status: number,
): GatewayEvent {
    // Baileys status codes: 1=pending, 2=sent(server), 3=delivered, 4=read, 5=played
    const statusMap: Record<number, string> = {
        2: 'sent',
        3: 'delivered',
        4: 'read',
        5: 'played',
    };

    return {
        id: ulid(),
        timestamp: Date.now(),
        type: 'message.status',
        payload: {
            messageId: key.id ?? '',
            chatId: jidToPhone(key.remoteJid),
            status: (statusMap[status] ?? 'sent') as 'sent' | 'delivered' | 'read' | 'played',
            timestamp: Date.now(),
        },
    };
}
