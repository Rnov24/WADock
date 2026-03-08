import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    type WASocket,
    type ConnectionState,
    type WAMessage,
    type BaileysEventMap,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { EventEmitter } from 'node:events';

export interface WADockTransport extends EventEmitter {
    socket: WASocket | null;
    connectionState: ConnectionState;
    qrCode: string | null;
    selfJid: string | null;
    start(): Promise<void>;
    stop(): Promise<void>;
    sendTextMessage(jid: string, text: string): Promise<string | undefined>;
    sendImageMessage(jid: string, image: Buffer | string, caption?: string): Promise<string | undefined>;
    sendDocumentMessage(jid: string, document: Buffer | string, filename: string, mimetype?: string): Promise<string | undefined>;
}

export function createTransport(dataDir: string, logLevel: string): WADockTransport {
    const sessionDir = join(dataDir, 'session');
    mkdirSync(sessionDir, { recursive: true });

    const logger = pino({ level: 'silent' }); // Baileys is noisy
    const emitter = new EventEmitter() as WADockTransport;

    emitter.socket = null;
    emitter.connectionState = { connection: 'close' } as ConnectionState;
    emitter.qrCode = null;
    emitter.selfJid = null;

    let retryCount = 0;
    const maxRetries = 10;

    emitter.start = async function () {
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version } = await fetchLatestBaileysVersion();

        const socket = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            logger,
            printQRInTerminal: false,
            generateHighQualityLinkPreview: false,
            // Optimization: Ignore WhatsApp Status/Stories
            shouldIgnoreJid: (jid) => jid === 'status@broadcast',
            // Optimization: Skip downloading/syncing media automatically
            syncFullHistory: false,
            markOnlineOnConnect: false,
        });

        emitter.socket = socket;

        emitter.connectionState = { connection: 'connecting' } as ConnectionState;

        // --- Connection updates ---
        socket.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;

            // If Baileys provides a connection status (open, close, connecting), update our state
            if (connection) {
                emitter.connectionState = { connection } as ConnectionState;
            }

            if (qr) {
                emitter.qrCode = qr;
                emitter.emit('qr', qr);
            }

            if (connection === 'open') {
                retryCount = 0;
                emitter.qrCode = null;
                emitter.selfJid = socket.user?.id ?? null;
                emitter.emit('connection', { status: 'open' });
            }

            if (connection === 'close') {
                const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;

                if (reason === DisconnectReason.loggedOut) {
                    emitter.emit('connection', { status: 'close', reason: 'logged_out' });
                    // Delete session files
                    import('node:fs').then(fs => fs.rmSync(sessionDir, { recursive: true, force: true }));
                    return;
                }

                // Auto-reconnect with backoff
                if (reason !== DisconnectReason.loggedOut && retryCount < maxRetries) {
                    retryCount++;
                    const delay = Math.min(1000 * Math.pow(2, retryCount), 60_000);
                    emitter.emit('connection', { status: 'close', reason: 'reconnecting', delay });
                    setTimeout(() => {
                        emitter.stop().then(() => emitter.start());
                    }, delay);
                } else {
                    emitter.emit('connection', { status: 'close', reason: 'max_retries' });
                }
            }
        });

        // --- Credential updates ---
        socket.ev.on('creds.update', saveCreds);

        // --- Incoming messages ---
        socket.ev.on('messages.upsert', (upsert) => {
            if (upsert.type !== 'notify') return;
            for (const msg of upsert.messages) {
                emitter.emit('message', msg);
            }
        });

        // --- Message status updates ---
        socket.ev.on('messages.update', (updates) => {
            for (const update of updates) {
                if (update.update.status) {
                    emitter.emit('message.status', {
                        key: update.key,
                        status: update.update.status,
                    });
                }
            }
        });
    };

    emitter.stop = async function () {
        if (emitter.socket) {
            emitter.socket.end(undefined);
            emitter.socket = null;
        }
    };

    // --- Send methods ---

    emitter.sendTextMessage = async function (jid: string, text: string) {
        if (!emitter.socket) throw new Error('Not connected');
        const result = await emitter.socket.sendMessage(jid, { text });
        return result?.key.id ?? undefined;
    };

    emitter.sendImageMessage = async function (
        jid: string,
        image: Buffer | string,
        caption?: string,
    ) {
        if (!emitter.socket) throw new Error('Not connected');
        const content = typeof image === 'string'
            ? { image: { url: image }, caption }
            : { image, caption };
        const result = await emitter.socket.sendMessage(jid, content);
        return result?.key.id ?? undefined;
    };

    emitter.sendDocumentMessage = async function (
        jid: string,
        document: Buffer | string,
        filename: string,
        mimetype?: string,
    ) {
        if (!emitter.socket) throw new Error('Not connected');
        const content = typeof document === 'string'
            ? { document: { url: document }, fileName: filename, mimetype: mimetype ?? 'application/octet-stream' }
            : { document, fileName: filename, mimetype: mimetype ?? 'application/octet-stream' };
        const result = await emitter.socket.sendMessage(jid, content);
        return result?.key.id ?? undefined;
    };

    return emitter;
}
